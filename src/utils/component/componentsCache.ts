'use strict';

import * as path from 'path';
import * as vsc from 'vscode';
import { Component } from './component';
import { Controller } from '../controller/controller';
import { SourceFile } from '../sourceFile';
import { SourceFilesScanner } from '../sourceFilesScanner';
import { FileWatcher } from "../fileWatcher";

export class ComponentsCache implements vsc.Disposable {
	private scanner = new SourceFilesScanner();
	private components: Component[] = [];
	private controllers: Controller[] = [];
	private watcher: FileWatcher;

	private setupWatchers = (config: vsc.WorkspaceConfiguration) => {
		const globs = config.get('componentGlobs') as string[];

		this.dispose();
		this.watcher = new FileWatcher(globs, this.onAdded, this.onChanged, this.onDeleted);
	}

	private onAdded = async (uri: vsc.Uri) => {
		const filepath = this.normalizePath(uri.fsPath);
		const src = await SourceFile.parse(filepath);
		const components = await Component.parse(src, this.controllers);

		this.components.push.apply(this.components, components);
	}

	private onChanged = async (uri: vsc.Uri) => {
		const filepath = this.normalizePath(uri.fsPath);

		const idx = this.components.findIndex(c => this.normalizePath(c.path) === filepath);
		if (idx === -1) {
			console.warn("Component does not exist, cannot update it");
			return;
		}

		const src = await SourceFile.parse(filepath);
		const components = await Component.parse(src, this.controllers);

		this.deleteComponentFile(filepath);
		this.components.push.apply(this.components, components);
	}

	private onDeleted = (uri: vsc.Uri) => {
		this.deleteComponentFile(this.normalizePath(uri.fsPath));
	}

	private deleteComponentFile = (filepath: string) => {
		let idx;
		do {
			idx = this.components.findIndex(c => this.normalizePath(c.path) === filepath);
			if (idx > -1) {
				this.components.splice(idx, 1);
			}
		} while (idx > -1);
	}

	public refresh = async (config?: vsc.WorkspaceConfiguration): Promise<Component[]> => {
		config = config || vsc.workspace.getConfiguration("ngComponents");

		this.setupWatchers(config);
		this.controllers = await this.scanner.findFiles("controllerGlobs", Controller.parse, "Controller");

		const parseComponent = (src: SourceFile) => Component.parse(src, this.controllers);

		return this.scanner.findFiles("componentGlobs", parseComponent, "Component").then((result: Component[]) => {
			this.components = result;

			return this.components;
		}).catch((err) => {
			console.error(err);
			vsc.window.showErrorMessage("There was an error refreshing components cache, check console for errors");
			return [];
		});
	}

	public dispose() {
		if (this.watcher) {
			this.watcher.dispose();
		}
	}

	private normalizePath = (p: string) => path.normalize(p).toLowerCase();
}
