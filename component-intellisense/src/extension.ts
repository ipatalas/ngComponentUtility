/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as vsc from 'vscode';

import { CompletionProvider } from './completionProvider';

export async function activate(context: vsc.ExtensionContext) {
	let completionProvider = new CompletionProvider();
	await completionProvider.scan();

	let completionProviderDisposable = vsc.languages.registerCompletionItemProvider("html", completionProvider, '<');

	context.subscriptions.push(completionProviderDisposable);
}