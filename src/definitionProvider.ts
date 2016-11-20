import * as vsc from 'vscode';

import { Component } from './utils/component';
import { HtmlDocumentHelper } from './utils/htmlDocumentHelper';
import { getLocation } from './utils/vsc';

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

			let wordPos = document.getWordRangeAtPosition(position);
			let word = document.getText(wordPos);

			let { tag } = HtmlDocumentHelper.parseTag(text);

			let component = this.components.find(c => c.htmlName === tag);
			if (component) {
				let binding = component.bindings.find(b => b.htmlName === word);
				if (binding) {
					return getLocation({ path: component.path, pos: binding.pos });
				}

				if (word === component.htmlName) {
					let results: vsc.Location[] = [];
					results.push(getLocation(component));

					if (component.template) {
						results.push(getLocation(component.template));
					}

					return results;
				}
			}
		}

		return [];
	}
}
