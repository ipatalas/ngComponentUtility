import * as vsc from 'vscode';

import { Component } from '../utils/component/component';
import { HtmlDocumentHelper } from '../utils/htmlDocumentHelper';
import { getLocation, getConfiguration } from '../utils/vsc';

export class ComponentDefinitionProvider implements vsc.DefinitionProvider {
	private components: Component[];

	public loadComponents = (components: Component[]) => {
		this.components = components;
	}

	public provideDefinition(document: vsc.TextDocument, position: vsc.Position, _token: vsc.CancellationToken): vsc.Definition {
		const bracketsBeforeCursor = HtmlDocumentHelper.findTagBrackets(document, position, 'backward');
		const bracketsAfterCursor = HtmlDocumentHelper.findTagBrackets(document, position, 'forward');

		if (HtmlDocumentHelper.isInsideAClosedTag(bracketsBeforeCursor, bracketsAfterCursor)) {
			// get everything from starting < tag till ending >
			const tagTextRange = new vsc.Range(bracketsBeforeCursor.opening, bracketsAfterCursor.closing);
			const text = document.getText(tagTextRange);

			const wordPos = document.getWordRangeAtPosition(position);
			const word = document.getText(wordPos);

			const { tag } = HtmlDocumentHelper.parseTag(text);

			const component = this.components.find(c => c.htmlName === tag);
			if (component) {
				const binding = component.bindings.find(b => b.htmlName === word);
				if (binding) {
					return getLocation({ path: component.path, pos: binding.pos });
				}

				if (word === component.htmlName) {
					const config = getConfiguration();
					const componentParts = config.get('goToDefinition') as string[];

					const results: vsc.Location[] = [];

					if (componentParts.some(p => p === 'component')) {
						results.push(getLocation(component));
					}

					if (componentParts.some(p => p === 'template') && component.template) {
						results.push(getLocation(component.template));
					}

					if (componentParts.some(p => p === 'controller') && component.controller) {
						results.push(getLocation(component.controller));
					}

					return results;
				}
			}
		}

		return [];
	}
}
