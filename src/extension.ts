'use strict';

import * as vsc from 'vscode';

import { Component } from './utils/component';
import { Controller } from './utils/controller';
import { SourceFile } from './utils/sourceFile';
import { SourceFilesScanner } from './utils/sourceFilesScanner';
import { CompletionProvider } from './completionProvider';
import { GoToDefinitionProvider } from './definitionProvider';

const HTML_DOCUMENT_SELECTOR: vsc.DocumentSelector = 'html';

const completionProvider = new CompletionProvider();
const definitionProvider = new GoToDefinitionProvider();
const scanner = new SourceFilesScanner();
let statusBar = vsc.window.createStatusBarItem(vsc.StatusBarAlignment.Left);

export async function activate(context: vsc.ExtensionContext) {
	try {
		scanner.init(vsc.workspace.rootPath);

		await refreshComponents();
	} catch (err) {
		console.error(err);
		vsc.window.showErrorMessage("Error initializing extension");
	}

	context.subscriptions.push(vsc.commands.registerCommand('extension.refreshAngularComponents', () => {
		refreshComponents().then(() => {
			vsc.window.showInformationMessage('Components cache has been rebuilt');
		});
	}));

	context.subscriptions.push(vsc.languages.registerCompletionItemProvider(HTML_DOCUMENT_SELECTOR, completionProvider, '<'));
	context.subscriptions.push(vsc.languages.registerDefinitionProvider(HTML_DOCUMENT_SELECTOR, definitionProvider));

	statusBar.tooltip = 'Refresh Angular components';
	statusBar.command = 'extension.refreshAngularComponents';
	statusBar.show();

	context.subscriptions.push(statusBar);
}

const refreshComponents = async (): Promise<void> => {
	const controllers = await scanner.findFiles("controllerGlobs", Controller.parse, "Controller");
	const parseComponent = (src: SourceFile) => Component.parse(src, controllers);

	return scanner.findFiles("componentGlobs", parseComponent, "Component").then((components: Component[]) => {
		completionProvider.loadComponents(components);
		definitionProvider.loadComponents(components);

		statusBar.text = `$(sync) ${components.length} components`;
	}).catch((err) => {
		console.error(err);
		vsc.window.showErrorMessage("There was an error refreshing components cache, check console for errors");
	});
};
