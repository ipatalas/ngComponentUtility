'use strict';

import * as _ from 'lodash';
import * as path from 'path';
import * as parse5 from 'parse5';
import * as fs from 'fs';
import * as vsc from 'vscode';
import * as prettyHrtime from 'pretty-hrtime';
import { default as tags } from './htmlTags';
import { workspaceRoot, findFiles } from './vsc';
import { IComponentTemplate } from './component/component';
import { FileWatcher } from './fileWatcher';
import { log } from './logging';

const htmlTags = new Set<string>(tags);

export class HtmlReferencesCache implements vsc.Disposable {
	private htmlReferences: IHtmlReferences;
	private watcher: FileWatcher;

	private setupWatchers = (config: vsc.WorkspaceConfiguration) => {
		const globs = config.get('htmlGlobs') as string[];

		this.dispose();
		this.watcher = new FileWatcher(globs, this.onAdded, this.onChanged, this.onDeleted);
	}

	private onAdded = async (uri: vsc.Uri) => {
		const filepath = this.normalizePath(uri.fsPath);
		this.parseFile(workspaceRoot, filepath, this.htmlReferences);
	}

	private onChanged = async (uri: vsc.Uri) => {
		const filepath = this.normalizePath(uri.fsPath);

		this.deleteFileReferences(filepath);
		this.parseFile(workspaceRoot, filepath, this.htmlReferences);
	}

	private onDeleted = (uri: vsc.Uri) => {
		this.deleteFileReferences(this.normalizePath(uri.fsPath));
	}

	private deleteFileReferences = (filepath: string) => {
		const emptyKeys = [];

		_.forIn(this.htmlReferences, (value, key) => {
			delete value[filepath];

			if (_.isEmpty(value)) {
				emptyKeys.push(key);
			}
		});

		emptyKeys.forEach(key => delete this.htmlReferences[key]);
	}

	private createParser = (resolve, reject, results, filepath, locationCb): parse5.SAXParser => {
		const parser = new parse5.SAXParser({ locationInfo: true });

		parser.on('startTag', (name, _attrs, _self, location) => {
			if (htmlTags.has(name)) {
				return;
			}

			results[name] = results[name] || {};
			results[name][filepath] = results[name][filepath] || [];
			results[name][filepath].push(locationCb(location));
		}).on('finish', () => {
			parser.end();
			resolve();
		}).on('error', (err) => {
			parser.end();
			reject(err);
		});

		return parser;
	}

	private parseFile = (projectPath, filePath, results) => {
		return new Promise<void>((resolve, reject) => {
			const getLocation = (location: parse5.MarkupData.StartTagLocation) => ({ line: location.line - 1, col: location.col - 1 });
			const parser = this.createParser(resolve, reject, results, filePath, getLocation);

			fs.createReadStream(path.join(projectPath, filePath)).pipe(parser);
		});
	}

	private parseTemplate = (template: IComponentTemplate, results) => {
		return new Promise<void>((resolve, reject) => {
			const filePath = this.normalizePath(template.path);

			const getLocation = (location: parse5.MarkupData.StartTagLocation) => ({
				line: template.pos.line + location.line - 1,
				col: (location.line === 1 ? template.pos.character + 1 : 0) + location.col
			});

			const parser = this.createParser(resolve, reject, results, filePath, getLocation);

			parser.write(template.body);
			parser.end();
		});
	}

	public loadInlineTemplates = async (templates: IComponentTemplate[]) => {
		await Promise.all(templates.map(c => this.parseTemplate(c, this.htmlReferences)));
	}

	public refresh = async (config?: vsc.WorkspaceConfiguration): Promise<IHtmlReferences> => {
		config = config || vsc.workspace.getConfiguration('ngComponents');

		try {
			this.setupWatchers(config);

			const results: IHtmlReferences = {};
			const htmlGlobs = config.get('htmlGlobs') as string[];

			let globTime = process.hrtime();

			const promises = htmlGlobs.map(g => findFiles(g, true));
			const files = _.flatten(await Promise.all(promises));
			globTime = process.hrtime(globTime);

			let parseTime = process.hrtime();
			await Promise.all(files.map(f => this.parseFile(workspaceRoot, f, results)));
			parseTime = process.hrtime(parseTime);

			log(`HTML stats [files=${files.length}, glob=${prettyHrtime(globTime)}, parse=${prettyHrtime(parseTime)}]`);

			this.htmlReferences = results;
			return this.htmlReferences;
		} catch (err) {
			// tslint:disable-next-line:no-console
			console.error(err);
			vsc.window.showErrorMessage('There was an error refreshing html components cache, check console for errors');
			return {};
		}
	}

	public dispose() {
		if (this.watcher) {
			this.watcher.dispose();
		}
	}

	// glob returns paths with forward slash on Windows whereas gaze returns them with OS specific separator
	private normalizePath = (p: string) => path.relative(workspaceRoot, p).replace('\\', '/');
}

export interface IHtmlReferences {
	[componentName: string]: IComponentReferences;
}

export interface IComponentReferences {
	[htmlPath: string]: IComponentReference[];
}

export interface IComponentReference {
	line: number;
	col: number;
}
