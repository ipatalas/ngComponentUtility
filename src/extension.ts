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
	scanner.init(vsc.workspace.rootPath);
	await refreshComponents();

	context.subscriptions.push(vsc.commands.registerCommand('extension.refreshAngularComponents', async () => {
		await refreshComponents();
		vsc.window.showInformationMessage('Components cache has been rebuilt');
	}));
	context.subscriptions.push(vsc.languages.registerCompletionItemProvider(HTML_DOCUMENT_SELECTOR, completionProvider, '<'));
	context.subscriptions.push(vsc.languages.registerDefinitionProvider(HTML_DOCUMENT_SELECTOR, definitionProvider));

	statusBar.tooltip = 'Refresh Angular components';
	statusBar.command = 'extension.refreshAngularComponents';
	statusBar.show();

	context.subscriptions.push(statusBar);
}

const refreshComponents = async () => {
	await scanner.findFiles();

	completionProvider.loadComponents(scanner.components);
	definitionProvider.loadComponents(scanner.components);

	statusBar.text = `$(sync) ${scanner.components.length} components`;
}
