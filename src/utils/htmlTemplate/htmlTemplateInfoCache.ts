'use strict';

import * as _ from 'lodash';
import * as parse5 from 'parse5';
import * as fs from 'fs';
import * as vsc from 'vscode';
import * as prettyHrtime from 'pretty-hrtime';
import { default as tags } from './htmlTags';
import { findFiles } from '../vsc';
import { IComponentTemplate } from '../component/component';
import { FileWatcher } from '../fileWatcher';
import { log, logError } from '../logging';
import { EventEmitter } from 'events';
import { events } from '../../symbols';
import { RelativePath } from './relativePath';

const htmlTags = new Set<string>(tags);

export class HtmlTemplateInfoCache extends EventEmitter implements vsc.Disposable {
	private htmlReferences: IHtmlReferences = {};
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

	private parseFile = (relativePath: RelativePath, results: IHtmlReferences) => {
		return new Promise<void>((resolve, reject) => {
			const getLocation = (location: parse5.MarkupData.StartTagLocation) => ({ line: location.line - 1, col: location.col - 1 });
			const htmlParser = this.createHtmlReferencesParser(resolve, reject, results, relativePath, getLocation);

			fs.createReadStream(relativePath.absolute).pipe(htmlParser);
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

	public loadInlineTemplates = async (templates: IComponentTemplate[]) => {
		await Promise.all(templates.map(c => this.parseInlineTemplate(c, this.htmlReferences)));
		return this.htmlReferences;
	}

	public refresh = async (config?: vsc.WorkspaceConfiguration): Promise<IHtmlReferences> => {
		config = config || vsc.workspace.getConfiguration('ngComponents');

		try {
			this.setupWatchers(config);

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
			return this.htmlReferences;
		} catch (err) {
			logError(err);
			vsc.window.showErrorMessage('There was an error refreshing html components cache, check console for errors');
			return {};
		}
	}

	public dispose() {
		if (this.watcher) {
			this.watcher.dispose();
		}

		this.removeAllListeners();
	}
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
