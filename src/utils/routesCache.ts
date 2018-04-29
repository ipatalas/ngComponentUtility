'use strict';

import * as path from 'path';
import * as vsc from 'vscode';
import { SourceFilesScanner } from './sourceFilesScanner';
import { Route } from './route';
import { SourceFile } from './sourceFile';
import { FileWatcher } from './fileWatcher';
import { EventEmitter } from 'events';
import { events } from '../symbols';

export class RoutesCache extends EventEmitter implements vsc.Disposable {
	private scanner = new SourceFilesScanner();
	private routes: Route[] = [];
	private watcher: FileWatcher;

	private emitRoutesChanged = () => this.emit(events.routesChanged, this.routes);

	private setupWatchers = (config: vsc.WorkspaceConfiguration) => {
		const globs = config.get('routeGlobs') as string[];

		this.dispose();
		this.watcher = new FileWatcher(globs, this.onAdded, this.onChanged, this.onDeleted);
	}

	private onAdded = async (uri: vsc.Uri) => {
		const filepath = this.normalizePath(uri.fsPath);
		const src = await SourceFile.parse(filepath);
		const routes = await Route.parse(src);

		this.routes.push(...routes);
		this.emitRoutesChanged();
	}

	private onChanged = async (uri: vsc.Uri) => {
		const filepath = this.normalizePath(uri.fsPath);

		const idx = this.routes.findIndex(c => this.normalizePath(c.path) === filepath);
		if (idx === -1) {
			// tslint:disable-next-line:no-console
			console.warn('Component does not exist, cannot update it');
			return;
		}

		const src = await SourceFile.parse(filepath);
		const routes = await Route.parse(src);

		this.deleteComponentFile(filepath);
		this.routes.push(...routes);
		this.emitRoutesChanged();
	}

	private onDeleted = (uri: vsc.Uri) => {
		this.deleteComponentFile(this.normalizePath(uri.fsPath));
		this.emitRoutesChanged();
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
		config = config || vsc.workspace.getConfiguration('ngComponents');

		this.setupWatchers(config);

		return this.scanner.findFiles('routeGlobs', Route.parse, 'Route').then((result: Route[]) => {
			this.routes = result;

			return this.routes;
		}).catch((err) => {
			// tslint:disable-next-line:no-console
			console.error(err);
			vsc.window.showErrorMessage('There was an error refreshing components cache, check console for errors');
			return [];
		});
	}

	public dispose() {
		if (this.watcher) {
			this.watcher.dispose();
		}

		this.removeAllListeners();
	}

	private normalizePath = (p: string) => path.normalize(p).toLowerCase();
}
