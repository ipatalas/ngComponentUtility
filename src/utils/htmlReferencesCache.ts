'use strict';

import * as _ from 'lodash';
import * as path from 'path';
import * as parse5 from 'parse5';
import * as fs from 'fs';
import * as vsc from 'vscode';
import { default as glob } from './glob';
import { default as tags } from './htmlTags';
import { workspaceRoot } from './vsc';

const htmlTags = new Set<string>(tags);
const PERF_GLOB = "Time consumed on finding HTML files";
const PERF_PARSE = "Time consumed on parsing HTML files";

// tslint:disable-next-line:no-var-requires
const gaze = require("gaze");

export class HtmlReferencesCache {
	private htmlReferences: IHtmlReferences;
	private watcher: any;
	private toDelete: string[] = [];

	private setupWatchers = (config: vsc.WorkspaceConfiguration) => {
		let globs = <string[]>config.get('htmlGlobs');

		if (this.watcher) {
			this.watcher.close(true);
		}

		this.watcher = new gaze.Gaze(globs, { cwd: workspaceRoot });
		this.watcher.on('renamed', this.onRename);
		this.watcher.on('added', this.onAdded);
		this.watcher.on('changed', this.onChanged);
		this.watcher.on('deleted', this.onDeleted);
	}

	private onAdded = async (filepath: string) => {
		filepath = this.normalizeGazePath(filepath);
		this.parseFile(workspaceRoot, filepath, this.htmlReferences);
	}

	// tslint:disable:no-console
	private onChanged = async (filepath: string) => {
		filepath = this.normalizeGazePath(filepath);

		this.deleteFileReferences(filepath);
		this.parseFile(workspaceRoot, filepath, this.htmlReferences);
	}

	private onDeleted = (filepath: string) => {
		filepath = this.normalizeGazePath(filepath);

		// workaround for gaze behavior - https://github.com/shama/gaze/issues/55
		setTimeout(this.commitDeleted, 500);
	}

	private onRename = (newPath: string, oldPath: string) => {
		oldPath = this.normalizeGazePath(oldPath);
		newPath = this.normalizeGazePath(newPath);

		// workaround continued - see link above
		const deletedIdx = this.toDelete.findIndex(p => p === oldPath);
		if (deletedIdx > -1) {
			this.toDelete.splice(deletedIdx, 1);
		}

		this.deleteFileReferences(oldPath);
		this.parseFile(workspaceRoot, newPath, this.htmlReferences);
	}

	private commitDeleted = () => {
		this.toDelete.forEach(this.deleteFileReferences);
		this.toDelete = [];
	}

	private deleteFileReferences = (filepath: string) => {
		_.forIn(this.htmlReferences, (value) => delete value[filepath]);
	}

	private parseFile = (projectPath, filePath, results) => {
		return new Promise<{}>((resolve, reject) => {
			let parser = new parse5.SAXParser({ locationInfo: true });

			parser.on("startTag", (name, _attrs, _self, location) => {
				if (htmlTags.has(name)) {
					return;
				}
				results[name] = results[name] || {};
				results[name][filePath] = results[name][filePath] || [];
				results[name][filePath].push({ line: location.line - 1, col: location.col - 1 });
			}).on('finish', () => {
				parser.end();
				resolve(results);
			}).on('error', (err) => {
				parser.end();
				reject(err);
			});

			fs.createReadStream(path.join(projectPath, filePath)).pipe(parser);
		});
	}

	public refresh = async (config?: vsc.WorkspaceConfiguration): Promise<IHtmlReferences> => {
		config = config || vsc.workspace.getConfiguration("ngComponents");

		try {
			this.setupWatchers(config);

			let results: IHtmlReferences = {};
			let htmlGlobs = <string[]>config.get("htmlGlobs");

			console.time(PERF_GLOB);
			let promises = htmlGlobs.map(pattern => glob(pattern, { absolute: false }));
			let files = _.flatten(await Promise.all(promises));
			console.timeEnd(PERF_GLOB);

			console.time(PERF_PARSE);
			await Promise.all(files.map(f => this.parseFile(workspaceRoot, f, results)));
			console.timeEnd(PERF_PARSE);

			this.htmlReferences = results;
			return this.htmlReferences;
		} catch (err) {
			console.error(err);
			vsc.window.showErrorMessage("There was an error refreshing html components cache, check console for errors");
			return {};
		}
	}

	// glob returns paths with forward slash on Windows whereas gaze returns them with OS specific separator
	private normalizeGazePath = (p: string) => path.relative(workspaceRoot, p).replace('\\', '/');
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