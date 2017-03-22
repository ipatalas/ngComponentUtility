'use strict';

import * as path from 'path';
import * as vsc from 'vscode';
import { SourceFilesScanner } from './sourceFilesScanner';
import { Route } from "./route";
import { SourceFile } from "./sourceFile";

// tslint:disable-next-line:no-var-requires
const gaze = require("gaze");

export class RoutesCache {
	private scanner = new SourceFilesScanner();
	private routes: Route[] = [];
	private watcher: any;
	private toDelete: string[] = [];

	private setupWatchers = (config: vsc.WorkspaceConfiguration) => {
		let globs = <string[]>config.get('routeGlobs');

		if (this.watcher) {
			this.watcher.close(true);
		}

		this.watcher = new gaze.Gaze(globs, { cwd: vsc.workspace.rootPath });
		this.watcher.on('renamed', this.onRename);
		this.watcher.on('added', this.onAdded);
		this.watcher.on('changed', this.onChanged);
		this.watcher.on('deleted', this.onDeleted);
	}

	private onAdded = async (filepath: string) => {
		const src = await SourceFile.parse(filepath);
		const routes = await Route.parse(src);

		this.routes.push(...routes);
	}

	private onChanged = async (filepath: string) => {
		filepath = this.normalizePath(filepath);

		const idx = this.routes.findIndex(c => this.normalizePath(c.path) === filepath);
		if (idx === -1) {
			console.warn("Component does not exist, cannot update it");
			return;
		}

		const src = await SourceFile.parse(filepath);
		const routes = await Route.parse(src);

		this.deleteComponentFile(filepath);
		this.routes.push(...routes);
	}

	private onDeleted = (filepath: string) => {
		this.toDelete.push(this.normalizePath(filepath));

		// workaround for gaze behavior - https://github.com/shama/gaze/issues/55
		setTimeout(this.commitDeleted, 500);
	}

	private onRename = (newPath: string, oldPath: string) => {
		oldPath = this.normalizePath(oldPath);

		// workaround continued - see link above
		const deletedIdx = this.toDelete.findIndex(p => p === oldPath);
		if (deletedIdx > -1) {
			this.toDelete.splice(deletedIdx, 1);
		}

		let route = this.routes.find(c => this.normalizePath(c.path) === oldPath);
		if (route) {
			route.path = newPath;
		}
	}

	private commitDeleted = () => {
		this.toDelete.forEach(this.deleteComponentFile);
		this.toDelete = [];
	}

	private deleteComponentFile = (filepath: string) => {
		let idx;
		do {
			idx = this.routes.findIndex(c => this.normalizePath(c.path) === filepath);
			if (idx > -1) {
				this.routes.splice(idx, 1);
			}
		} while (idx > -1);
	}

	public refresh = async (config?: vsc.WorkspaceConfiguration): Promise<Route[]> => {
		config = config || vsc.workspace.getConfiguration("ngComponents");

		this.setupWatchers(config);

		return this.scanner.findFiles("routeGlobs", Route.parse, "Route").then((result: Route[]) => {
			this.routes = result;

			return this.routes;
		}).catch((err) => {
			console.error(err);
			vsc.window.showErrorMessage("There was an error refreshing components cache, check console for errors");
			return [];
		});
	}

	private normalizePath = (p: string) => path.normalize(p).toUpperCase();
}
