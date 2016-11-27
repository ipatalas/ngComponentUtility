'use strict';

import * as vsc from 'vscode';

import { Component } from './utils/component';
import { Controller } from './utils/controller';
import { SourceFile } from './utils/sourceFile';
import { SourceFilesScanner } from './utils/sourceFilesScanner';
import { CompletionProvider } from './completionProvider';
import { GoToDefinitionProvider } from './definitionProvider';
import { overrideConsole, revertConsole } from './utils/vsc';

const HTML_DOCUMENT_SELECTOR: vsc.DocumentSelector = 'html';

const completionProvider = new CompletionProvider();
const definitionProvider = new GoToDefinitionProvider();
const scanner = new SourceFilesScanner();
const statusBar = vsc.window.createStatusBarItem(vsc.StatusBarAlignment.Left);
const debugChannel = vsc.window.createOutputChannel("ng1.5 components utility - debug");

export async function activate(context: vsc.ExtensionContext) {
	context.subscriptions.push(debugChannel);
	refreshDebugConsole();

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

	context.subscriptions.push(vsc.workspace.onDidChangeConfiguration(() => {
		refreshDebugConsole();
	}));

	context.subscriptions.push(vsc.languages.registerCompletionItemProvider(HTML_DOCUMENT_SELECTOR, completionProvider, '<'));
	context.subscriptions.push(vsc.languages.registerDefinitionProvider(HTML_DOCUMENT_SELECTOR, definitionProvider));

	statusBar.tooltip = 'Refresh Angular components';
	statusBar.command = 'extension.refreshAngularComponents';
	statusBar.show();

	context.subscriptions.push(statusBar);
}

const refreshDebugConsole = () => {
	const debugConsoleEnabled = <boolean>vsc.workspace.getConfiguration("ngComponents").get("debugConsole");
	if (debugConsoleEnabled) {
		overrideConsole(debugChannel);
	} else {
		revertConsole();
		debugChannel.hide();
	}
}

const refreshComponents = async (): Promise<void> => {
	const config = vsc.workspace.getConfiguration("ngComponents");
	const componentParts = <string[]>config.get("goToDefinition");
	const searchForControllers = componentParts.some(p => p === "controller");

	let controllers: Controller[] = [];
	if (searchForControllers) {
		controllers = await scanner.findFiles("controllerGlobs", Controller.parse, "Controller");
	}

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
