import * as vsc from 'vscode';

import { Component } from './utils/component';
import { HtmlDocumentHelper } from './utils/htmlDocumentHelper';

export class GoToDefinitionProvider implements vsc.DefinitionProvider {
	private components: Component[];

	public loadComponents = (components: Component[]) => {
		this.components = components;
	}

	public provideDefinition(document: vsc.TextDocument, position: vsc.Position, _token: vsc.CancellationToken): vsc.Definition {
		let bracketsBeforeCursor = HtmlDocumentHelper.findTagBrackets(document, position, 'backward');
		let bracketsAfterCursor = HtmlDocumentHelper.findTagBrackets(document, position, 'forward');

		if (HtmlDocumentHelper.isInsideAClosedTag(bracketsBeforeCursor, bracketsAfterCursor)) {
			// get everything from starting < tag till ending >
			let tagTextRange = new vsc.Range(bracketsBeforeCursor.opening, bracketsAfterCursor.closing);
			let text = document.getText(tagTextRange);

			let { tag } = HtmlDocumentHelper.parseTag(text);

			let component = this.components.find(c => c.htmlName === tag);
			if (component) {
				return new vsc.Location(vsc.Uri.file(component.path), new vsc.Position(component.pos.line, component.pos.character));
			}
		}

		return [];
	}
}
