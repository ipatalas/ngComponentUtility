/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as path from 'path';
import * as vsc from 'vscode';

import { ComponentScanner } from './componentScanner';


export function activate(context: vsc.ExtensionContext) {
	let completionProvider = vsc.languages.registerCompletionItemProvider("html", new CompletionProvider(), '<');

	context.subscriptions.push(completionProvider);
}

class CompletionProvider implements vsc.CompletionItemProvider {
	private scanner: ComponentScanner;

	constructor() {
		this.scanner = new ComponentScanner();
		this.scanner.init(vsc.workspace.rootPath);
		this.scanner.findFiles();
	}

	provideCompletionItems = (document: vsc.TextDocument, position: vsc.Position, token: vsc.CancellationToken): vsc.CompletionItem[] | Thenable<vsc.CompletionItem[]> | vsc.CompletionList | Thenable<vsc.CompletionList> => {
		return this.scanner.components.map(
			(c, i): any => {
				var bindings: string = "";
				c.bindings.forEach(p => {
					bindings += `${p.htmlName}="" `;
				});
				let item = new vsc.CompletionItem(c.htmlName, vsc.CompletionItemKind.Class);
				item.insertText = `<${c.htmlName} ${bindings}></${c.htmlName}>`;

				// documentation: JSON.stringify(c.bindings.keys())

				return item;
			});
	}
}