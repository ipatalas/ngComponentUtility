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

export async function activate(context: vsc.ExtensionContext) {
	let scanner = new ComponentScanner();
	scanner.init(vsc.workspace.rootPath);
	await scanner.findFiles();

	let completionProvider = new CompletionProvider(scanner.components);
	context.subscriptions.push(vsc.languages.registerCompletionItemProvider(HTML_DOCUMENT_SELECTOR, completionProvider, '<'));

	let definitionProvider = new GoToDefinitionProvider(scanner.components);
	context.subscriptions.push(vsc.languages.registerDefinitionProvider(HTML_DOCUMENT_SELECTOR, definitionProvider));
}
