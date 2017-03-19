import * as vsc from 'vscode';

import { Component } from '../utils/component';
import { HtmlDocumentHelper } from '../utils/htmlDocumentHelper';
import { getLocation } from '../utils/vsc';

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
					const config = vsc.workspace.getConfiguration("ngComponents");
					let componentParts = <string[]>config.get("goToDefinition");

					let results: vsc.Location[] = [];

					if (componentParts.some(p => p === "component")) {
						results.push(getLocation(component));
					}

					if (componentParts.some(p => p === "template") && component.template) {
						results.push(getLocation(component.template));
					}

					if (componentParts.some(p => p === "controller") && component.controller) {
						results.push(getLocation(component.controller));
					}

					return results;
				}
			}
		}

		return [];
	}
}
