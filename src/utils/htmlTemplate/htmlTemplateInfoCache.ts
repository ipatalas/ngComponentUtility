'use strict';

import { Readable } from 'stream';
import * as _ from 'lodash';
import * as parse5 from 'parse5';
import * as fs from 'fs';
import * as vsc from 'vscode';
import * as prettyHrtime from 'pretty-hrtime';

import { default as tags } from './htmlTags';
import { findFiles, getConfiguration } from '../vsc';
import { IComponentTemplate, IComponentBase } from '../component/component';
import { FileWatcher } from '../fileWatcher';
import { log, logError, logVerbose } from '../logging';
import { EventEmitter } from 'events';
import { events } from '../../symbols';
import { RelativePath } from './relativePath';
import { SplitToLines } from './streams/splitToLines';
import { MemberAccessParser, IMemberAccessEntry } from './streams/memberAccessParser';
import { IHtmlTemplateInfoResults } from './types';
import { HtmlTemplateInfoResults } from './htmlTemplateInfoResult';
import { Directive } from '../directive/directive';

const htmlTags = new Set<string>(tags);

export class HtmlTemplateInfoCache extends EventEmitter implements vsc.Disposable {
    private componentAliasMap: Map<string, string>;
    private results: HtmlTemplateInfoResults;
    private watcher: FileWatcher;
    private directivesSet: Set<string> = new Set<string>();

    private isMemberDiagnosticEnabled = (config?: vsc.WorkspaceConfiguration) => {
        return (config || getConfiguration()).get<boolean>('memberDiagnostics.enabled');
    }

    private emitReferencesChanged = () => this.emit(events.htmlReferencesChanged, this.results);

    private setupWatchers = (config: vsc.WorkspaceConfiguration) => {
        const globs = config.get('htmlGlobs') as string[];

        this.dispose();
        this.watcher = new FileWatcher('HTML template', globs, this.onAdded, this.onChanged, this.onDeleted);
    }

    private onAdded = async (uri: vsc.Uri) => {
        const isMemberDiagnosticEnabled = this.isMemberDiagnosticEnabled();

        await this.parseFile(RelativePath.fromUri(uri), this.results, isMemberDiagnosticEnabled);
        this.emitReferencesChanged();
    }

    private onChanged = async (uri: vsc.Uri) => {
        const relativePath = RelativePath.fromUri(uri);
        const isMemberDiagnosticEnabled = this.isMemberDiagnosticEnabled();

        this.results.deleteTemplate(relativePath.relative);
        await this.parseFile(relativePath, this.results, isMemberDiagnosticEnabled);
        this.emitReferencesChanged();
    }

    private onDeleted = (uri: vsc.Uri) => {
        const relativePath = RelativePath.fromUri(uri);

        this.results.deleteTemplate(relativePath.relative);
        this.emitReferencesChanged();
    }

    private createHtmlReferencesParser = (resolve, reject, results: HtmlTemplateInfoResults, relativePath: string, locationCb): parse5.SAXParser => {
        const parser = new parse5.SAXParser({ locationInfo: true });
        const isFormTag = name => name === 'form' || name === 'ng-form';

        parser.on('startTag', (name, attrs, _self, location) => {
            if (isFormTag(name)) {
                const nameAttr = attrs.find(a => a.name === 'name');
                if (nameAttr) {
                    results.addFormName(relativePath, nameAttr.value, location.attrs.name);
                }
            }

            attrs.forEach(attr => {
                if (this.directivesSet.has(attr.name)) {
                    results.addDirectiveReference(attr.name, relativePath, locationCb(location.attrs[attr.name]));
                }
            });

            if (htmlTags.has(name)) {
                return;
            }

            if (this.directivesSet.has(name)) {
                results.addDirectiveReference(name, relativePath, locationCb(location));
            } else {
                results.addHtmlReference(name, relativePath, locationCb(location));
            }
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

    private createMemberAccessParser = (results: HtmlTemplateInfoResults, relativePath: string): MemberAccessParser => {
        const alias = this.componentAliasMap.get(relativePath);

        if (!alias) {
            logVerbose(`Cannot find component for '${relativePath}'. Member access validation will not work here :(`);
            return null;
        }

        const parser = new MemberAccessParser(alias);
        parser.on(<any>events.memberFound, (e: IMemberAccessEntry) => results.addMemberAccess(relativePath, e));
        parser.on('finish', () => parser.end());
        parser.on('error', () => parser.end());

        return parser;
    }

    public parseFile = (relativePath: RelativePath, results: HtmlTemplateInfoResults, isMemberDiagnosticEnabled: boolean, overridenFileContents?: string) => {
        return new Promise<void>((resolve, reject) => {
            const getLocation = (location: parse5.MarkupData.StartTagLocation) => ({ line: location.line - 1, col: location.col - 1 });
            const htmlParser = this.createHtmlReferencesParser(resolve, reject, results, relativePath.relative, getLocation);

            const stream = this.createStream(relativePath, overridenFileContents).pipe(htmlParser);

            if (isMemberDiagnosticEnabled) {
                const memberAccessParser = this.createMemberAccessParser(results, relativePath.relative);
                if (memberAccessParser) {
                    const splitToLines = this.createSplitToLinesStream();
                    stream.pipe(splitToLines).pipe(memberAccessParser);
                }
            }
        });
    }

    private createStream = (relativePath: RelativePath, overridenFileContents?: string) => {
        if (!overridenFileContents) {
            return fs.createReadStream(relativePath.absolute);
        }

        const readable = new Readable();
        readable.push(overridenFileContents);
        readable.push(null);

        return readable;
    }

    private parseInlineTemplate = (template: IComponentTemplate, results: HtmlTemplateInfoResults) => {
        return new Promise<void>((resolve, reject) => {
            const relativePath = new RelativePath(template.path);

            const getLocation = (location: parse5.MarkupData.StartTagLocation) => ({
                line: template.pos.line + location.line - 1,
                col: (location.line === 1 ? template.pos.character + 1 : 0) + location.col
            });

            const parser = this.createHtmlReferencesParser(resolve, reject, results, relativePath.relative, getLocation);
            parser.end(template.body);
        });
    }

    private buildComponentAliasMap = (components: IComponentBase[]): Map<string, string> => {
        return components.filter(c => c.template && !c.template.body).reduce((map, component) => {
            const relativePath = new RelativePath(component.template.path).relative;

            if (!map.has(relativePath)) {
                map.set(relativePath, component.controllerAs);
            }

            return map;
        }, new Map<string, string>());
    }

    public loadInlineTemplates = async (templates: IComponentTemplate[]): Promise<IHtmlTemplateInfoResults> => {
        this.results = this.results || new HtmlTemplateInfoResults();
        await Promise.all(templates.map(c => this.parseInlineTemplate(c, this.results)));
        return this.results;
    }

    public refresh = async (components: IComponentBase[], directives: Directive[]): Promise<IHtmlTemplateInfoResults> => {
        const config = getConfiguration();

        try {
            const isMemberDiagnosticEnabled = this.isMemberDiagnosticEnabled(config);

            this.setupWatchers(config);
            this.componentAliasMap = isMemberDiagnosticEnabled && this.buildComponentAliasMap(components);
            this.directivesSet = new Set<string>(directives.map(d => d.htmlName));

            const results = new HtmlTemplateInfoResults();
            const htmlGlobs = config.get('htmlGlobs') as string[];

            let globTime = process.hrtime();

            const promises = htmlGlobs.map(g => findFiles(g));
            const files = _.flatten(await Promise.all(promises));
            globTime = process.hrtime(globTime);

            let parseTime = process.hrtime();
            await Promise.all(files.map(f => this.parseFile(new RelativePath(f), results, isMemberDiagnosticEnabled)));
            parseTime = process.hrtime(parseTime);

            log(`HTML stats [files=${files.length}, glob=${prettyHrtime(globTime)}, parse=${prettyHrtime(parseTime)}]`);

            this.results = results;
            return results;
        } catch (err) {
            logError(err);
            vsc.window.showErrorMessage('There was an error refreshing html components cache, check console for errors');
            return new HtmlTemplateInfoResults();
        }
    }

    public dispose() {
        if (this.watcher) {
            this.watcher.dispose();
        }

        this.removeAllListeners();
    }
}
