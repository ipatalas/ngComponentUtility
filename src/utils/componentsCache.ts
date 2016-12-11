'use strict';

import * as path from 'path';
import * as vsc from 'vscode';
import { Component } from './component';
import { Controller } from './controller';
import { SourceFile } from './sourceFile';
import { SourceFilesScanner } from './sourceFilesScanner';

// tslint:disable-next-line:no-var-requires
const Gaze = require("gaze").Gaze;

export class ComponentsCache {
	private scanner = new SourceFilesScanner();
	private components: Component[] = [];
	private controllers: Controller[] = [];
	private watcher: any;
	private toDelete: string[] = [];

	public init = () => {
		this.scanner.init(vsc.workspace.rootPath);
	}

	private setupWatchers = (config: vsc.WorkspaceConfiguration) => {
		let globs = <string[]>config.get('componentGlobs');

		if (this.watcher) {
			this.watcher.close(true);
		}

		this.watcher = new Gaze(globs, { cwd: vsc.workspace.rootPath });
		this.watcher.on('renamed', this.onRename);
		this.watcher.on('added', this.onAdded);
		this.watcher.on('changed', this.onChanged);
		this.watcher.on('deleted', this.onDeleted);
	}

	private onAdded = async (filepath: string) => {
		const src = await SourceFile.parse(filepath);
		const components = await Component.parse(src, this.controllers);

		this.components.push.apply(this.components, components);
	}

	private onChanged = async (filepath: string) => {
		filepath = this.normalizePath(filepath);

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

		let component = this.components.find(c => this.normalizePath(c.path) === oldPath);
		if (component) {
			component.path = newPath;
		}
	}

	private commitDeleted = () => {
		this.toDelete.forEach(this.deleteComponentFile);
		this.toDelete = [];
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

		const componentParts = <string[]>config.get("goToDefinition");
		const searchForControllers = componentParts.some(p => p === "controller");

		this.controllers = [];
		if (searchForControllers) {
			this.controllers = await this.scanner.findFiles("controllerGlobs", Controller.parse, "Controller");
		}

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

	private normalizePath = (p: string) => path.normalize(p).toUpperCase();
}
