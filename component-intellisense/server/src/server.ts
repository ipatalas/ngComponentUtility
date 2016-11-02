/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import {
	IPCMessageReader, IPCMessageWriter,
	createConnection, IConnection, TextDocumentSyncKind,
	TextDocuments, TextDocument, Diagnostic, DiagnosticSeverity,
	InitializeParams, InitializeResult, TextDocumentPositionParams,
	CompletionItem, CompletionItemKind, TextEdit, Range, Position, Command
} from 'vscode-languageserver';

import * as glob from 'glob';
import { config, Settings } from './config';
import { SolutionScaner } from './scaner';
import * as moment from 'moment';

// Create a connection for the server. The connection uses Node's IPC as a transport
let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();

let skaner = new SolutionScaner();
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// After the server has started the client sends an initilize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilites.
let workspaceRoot: string;
connection.onInitialize((params): InitializeResult => {
	workspaceRoot = params.rootPath;

	if (workspaceRoot) {
		let start = moment();
		skaner.init(workspaceRoot);
		skaner.findFiles();
		let diff = moment().diff(start);
		connection.console.info(`Finished in ${moment.duration(diff).asMilliseconds()}ms`);
	}

	return {
		capabilities: {
			// Tell the client that the server works in FULL text document sync mode
			textDocumentSync: documents.syncKind,
			// Tell the client that the server support code complete
			completionProvider: {
				resolveProvider: true
			}
		}
	}
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {

});

// The settings have changed. Is send on server activation
// as well.
connection.onDidChangeConfiguration((change) => {
	connection.console.info("didChangeConfiguration");
	let settings = <Settings>change.settings;
	config.reload(settings);
});


connection.onDidChangeWatchedFiles((change) => {
	// Monitored files have change in VSCode
	connection.console.log('We recevied an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion((textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
	// The pass parameter contains the position of the text document in
	// which code complete got requested. For the example we ignore this
	// info and always provide the same completion items.
	debugger
	return skaner.components.map(
		(c, i): any => {
			var bindings: string = "";
			c.bindings.forEach(p => {
				bindings += `${p.htmlName}="" `;
			});
			var item: CompletionItem = <CompletionItem>{
				label: c.htmlName,
				kind: CompletionItemKind.Text,
				data: i,
				insertText: `<${c.htmlName} ${bindings}></${c.htmlName}>`
				// documentation: JSON.stringify(c.bindings.keys())
			};

			return item;
		});
});

// This handler resolve additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {


	// if (item.data === 1) {
	// 	item.detail = 'TypeScript details';
	// 	item.documentation = 'TypeScript documentation';
	// 	item.insertText = "Inserted Text";
	// 	// item.additionalTextEdits = [
	// 	// 	TextEdit.insert(Position.create(0, 10), "New text"),
	// 	// 	TextEdit.del(Range.create(1, 0, 1, 3)),
	// 	// 	TextEdit.replace(Range.create(2, 0, 2, 5), "Replaced")
	// 	// ];
	// } else if (item.data === 2) {
	// 	item.detail = 'JavaScript details';
	// 	item.documentation = 'JavaScript documentation'
	// }
	return item;
});

/*
connection.onDidOpenTextDocument((params) => {
	// A text document got opened in VSCode.
	// params.uri uniquely identifies the document. For documents store on disk this is a file URI.
	// params.text the initial full content of the document.
	connection.console.log(`${params.uri} opened.`);
});

connection.onDidChangeTextDocument((params) => {
	// The content of a text document did change in VSCode.
	// params.uri uniquely identifies the document.
	// params.contentChanges describe the content changes to the document.
	connection.console.log(`${params.uri} changed: ${JSON.stringify(params.contentChanges)}`);
});

connection.onDidCloseTextDocument((params) => {
	// A text document got closed in VSCode.
	// params.uri uniquely identifies the document.
	connection.console.log(`${params.uri} closed.`);
});
*/

// Listen on the connection
connection.listen();