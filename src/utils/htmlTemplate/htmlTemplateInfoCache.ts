'use strict';

import * as _ from 'lodash';
import * as parse5 from 'parse5';
import * as fs from 'fs';
import * as vsc from 'vscode';
import * as prettyHrtime from 'pretty-hrtime';
import { default as tags } from './htmlTags';
import { findFiles } from '../vsc';
import { IComponentTemplate, Component } from '../component/component';
import { FileWatcher } from '../fileWatcher';
import { log, logError } from '../logging';
import { EventEmitter } from 'events';
import { events } from '../../symbols';
import { RelativePath } from './relativePath';
import { SplitToLines } from './streams/splitToLines';
import { MemberAccessParser, IMemberAccessEntry } from './streams/memberAccessParser';

const htmlTags = new Set<string>(tags);

export class HtmlTemplateInfoCache extends EventEmitter implements vsc.Disposable {
    private componentAliasMap: Map<string, string>;
    private htmlReferences: IHtmlReferences = {};
    private memberAccess: IMemberAccessResults = {};
    private watcher: FileWatcher;

    private emitReferencesChanged = () => this.emit(events.htmlReferencesChanged, this.htmlReferences);

    private setupWatchers = (config: vsc.WorkspaceConfiguration) => {
        const globs = config.get('htmlGlobs') as string[];

        this.dispose();
        this.watcher = new FileWatcher('HTML template', globs, this.onAdded, this.onChanged, this.onDeleted);
    }

    private onAdded = async (uri: vsc.Uri) => {
        this.parseFile(RelativePath.fromUri(uri), this.htmlReferences);
        this.emitReferencesChanged();
    }

    private onChanged = async (uri: vsc.Uri) => {
        const relativePath = RelativePath.fromUri(uri);

        this.deleteFileReferences(relativePath);
        this.parseFile(relativePath, this.htmlReferences);
        this.emitReferencesChanged();
    }

    private onDeleted = (uri: vsc.Uri) => {
        this.deleteFileReferences(RelativePath.fromUri(uri));
        this.emitReferencesChanged();
    }

    private deleteFileReferences = (relativePath: RelativePath) => {
        const emptyKeys = [];

        _.forIn(this.htmlReferences, (value, key) => {
            delete value[relativePath.relative];

            if (_.isEmpty(value)) {
                emptyKeys.push(key);
            }
        });

        emptyKeys.forEach(key => delete this.htmlReferences[key]);
    }

    private createHtmlReferencesParser = (resolve, reject, htmlReferences: IHtmlReferences, relativePath: RelativePath, locationCb): parse5.SAXParser => {
        const parser = new parse5.SAXParser({ locationInfo: true });

        parser.on('startTag', (name, _attrs, _self, location) => {
            if (htmlTags.has(name)) {
                return;
            }

            htmlReferences[name] = htmlReferences[name] || {};
            htmlReferences[name][relativePath.relative] = htmlReferences[name][relativePath.relative] || [];
            htmlReferences[name][relativePath.relative].push(locationCb(location));
        }).on('finish', () => {
            parser.end();
            resolve();
        }).on('error', (err) => {
            parser.end();
            reject(err);
        });

        return parser;
    }

    private createSplitToLinesStream = () => {
        const stream = new SplitToLines();

        stream.on('finish', () => stream.end());
        stream.on('error', () => stream.end());

        return stream;
    }

    private createMemberAccessParser = (relativePath: RelativePath) => {
        const alias = this.componentAliasMap.get(relativePath.relative);

        const parser = new MemberAccessParser(alias);
        parser.on(<any>events.memberFound, (e: IMemberAccessEntry) => {
            this.memberAccess[relativePath.relative] = this.memberAccess[relativePath.relative] || [];
            this.memberAccess[relativePath.relative].push(e);
        });

        parser.on('finish', () => parser.end());
        parser.on('error', () => parser.end());

        return parser;
    }

    private parseFile = (relativePath: RelativePath, results: IHtmlReferences) => {
        return new Promise<void>((resolve, reject) => {
            const getLocation = (location: parse5.MarkupData.StartTagLocation) => ({ line: location.line - 1, col: location.col - 1 });
            const htmlParser = this.createHtmlReferencesParser(resolve, reject, results, relativePath, getLocation);
            const splitToLines = this.createSplitToLinesStream();
            const memberAccessParser = this.createMemberAccessParser(relativePath);

            fs.createReadStream(relativePath.absolute)
                .pipe(htmlParser)
                .pipe(splitToLines)
                .pipe(memberAccessParser);
        });
    }

    private parseInlineTemplate = (template: IComponentTemplate, htmlReferences: IHtmlReferences) => {
        return new Promise<void>((resolve, reject) => {
            const relativePath = new RelativePath(template.path);

            const getLocation = (location: parse5.MarkupData.StartTagLocation) => ({
                line: template.pos.line + location.line - 1,
                col: (location.line === 1 ? template.pos.character + 1 : 0) + location.col
            });

            const parser = this.createHtmlReferencesParser(resolve, reject, htmlReferences, relativePath, getLocation);
            parser.end(template.body);
        });
    }

    // TODO: use route components as well here
    private buildComponentAliasMap = (components: Component[]): Map<string, string> => {
        components.filter(c => !c.template).forEach(c => console.log(c.name));

        return components.filter(c => c.template && !c.template.body).reduce((map, component) => {
            const relativePath = new RelativePath(component.template.path).relative;

            if (!map.has(relativePath)) {
                map.set(relativePath, component.controllerAs);
            }

            return map;
        }, new Map<string, string>());
    }

    public loadInlineTemplates = async (templates: IComponentTemplate[]) => {
        await Promise.all(templates.map(c => this.parseInlineTemplate(c, this.htmlReferences)));
        return this.htmlReferences;
    }

    public refresh = async (config: vsc.WorkspaceConfiguration, components: Component[]): Promise<IHtmlTemplateInfoResult> => {
        config = config || vsc.workspace.getConfiguration('ngComponents');

        try {
            this.setupWatchers(config);
            this.componentAliasMap = this.buildComponentAliasMap(components);
            this.memberAccess = {};

            const results: IHtmlReferences = {};
            const htmlGlobs = config.get('htmlGlobs') as string[];

            let globTime = process.hrtime();

            const promises = htmlGlobs.map(g => findFiles(g));
            const files = _.flatten(await Promise.all(promises));
            globTime = process.hrtime(globTime);

            let parseTime = process.hrtime();
            await Promise.all(files.map(f => this.parseFile(new RelativePath(f), results)));
            parseTime = process.hrtime(parseTime);

            log(`HTML stats [files=${files.length}, glob=${prettyHrtime(globTime)}, parse=${prettyHrtime(parseTime)}]`);

            this.htmlReferences = results;
            return {
                htmlReferences: this.htmlReferences,
                memberAccess: this.memberAccess
            };
        } catch (err) {
            logError(err);
            vsc.window.showErrorMessage('There was an error refreshing html components cache, check console for errors');
            return {
                htmlReferences: null,
                memberAccess: null
            };
        }
    }

    public dispose() {
        if (this.watcher) {
            this.watcher.dispose();
        }

        this.removeAllListeners();
    }
}

export interface IHtmlTemplateInfoResult {
    htmlReferences: IHtmlReferences;
    memberAccess: IMemberAccessResults;
}

export interface IHtmlReferences {
    [componentName: string]: IComponentReferences;
}

export interface IComponentReferences {
    [relativeHtmlPath: string]: IComponentReference[];
}

export interface IComponentReference {
    line: number;
    col: number;
}

export interface IMemberAccessResults {
    [relativeHtmlPath: string]: IMemberAccessEntry[];
}
