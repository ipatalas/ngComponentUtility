import * as vsc from 'vscode';
import { Component } from '../utils/component/component';
import { Commands } from './commands';

export class SwitchComponentPartsCommand implements vsc.Disposable {
	private disposable: vsc.Disposable;

	constructor(getComponents: () => Component[]) {
		this.disposable = vsc.commands.registerCommand(Commands.SwitchComponentParts, () => this.execute(getComponents()));
	}

	public execute = async (components: Component[]) => {
		if (!vsc.window.activeTextEditor || vsc.window.activeTextEditor.document.uri.scheme !== 'file') {
			return;
		}

		const uri = vsc.window.activeTextEditor.document.uri;
		const component = components.find(c => this.isComponentUri(c, uri) || this.isControllerUri(c, uri) || this.isTemplateUri(c, uri));

		if (component) {
			const path = this.getNextPartPath(component, uri);
			if (path) {
				const document = await vsc.workspace.openTextDocument(path);
				await vsc.window.showTextDocument(document);
			}
		}
	}

	private getNextPartPath = (component: Component, uri: vsc.Uri): string => {
		if (this.isComponentUri(component, uri)) {
			return component.controller && component.controller.path || component.template && component.template.path;
		}

		if (this.isControllerUri(component, uri)) {
			return component.template && component.template.path || component.path;
		}

		if (this.isTemplateUri(component, uri)) {
			return component.path;
		}
	}

	private isComponentUri = (component: Component, uri: vsc.Uri): boolean => component.path === uri.fsPath;
	private isControllerUri = (component: Component, uri: vsc.Uri): boolean => component.controller && component.controller.path === uri.fsPath;
	private isTemplateUri = (component: Component, uri: vsc.Uri): boolean => component.template && component.template.path === uri.fsPath;

	public dispose() {
		this.disposable && this.disposable.dispose();
	}
}
