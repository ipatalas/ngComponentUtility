/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as vsc from 'vscode';

import { ComponentScanner } from './utils/componentScanner';
import { CompletionProvider } from './completionProvider';
import { GoToDefinitionProvider } from './definitionProvider';

const HTML_DOCUMENT_SELECTOR: vsc.DocumentSelector = 'html';

const completionProvider = new CompletionProvider();
const definitionProvider = new GoToDefinitionProvider();
const scanner = new ComponentScanner();
let statusBar = vsc.window.createStatusBarItem(vsc.StatusBarAlignment.Left);

export async function activate(context: vsc.ExtensionContext) {
	try {
		scanner.init(vsc.workspace.rootPath);

		await refreshComponents();
	} catch (err) {
		console.error(err);
		vsc.window.showErrorMessage("Error initializing extension");
	}

	context.subscriptions.push(vsc.commands.registerCommand('extension.refreshAngularComponents', async () => {
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
	return scanner.findFiles().then(() => {
		completionProvider.loadComponents(scanner.components);
		definitionProvider.loadComponents(scanner.components);

		statusBar.text = `$(sync) ${scanner.components.length} components`;
	}).catch((err) => {
		console.error(err);
		vsc.window.showErrorMessage("There was an error refreshing components cache, check console for errors");
	});
};
