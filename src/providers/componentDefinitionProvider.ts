import * as vsc from 'vscode';

import { Component } from '../utils/component/component';
import { HtmlDocumentHelper } from '../utils/htmlDocumentHelper';
import { getLocation } from '../utils/vsc';

export class ComponentDefinitionProvider implements vsc.DefinitionProvider {
	private components: Component[];

	constructor(private htmlDocumentHelper: HtmlDocumentHelper, private getConfig: () => vsc.WorkspaceConfiguration) {}

	public loadComponents = (components: Component[]) => {
		this.components = components;
	}

	public provideDefinition(document: vsc.TextDocument, position: vsc.Position, _token: vsc.CancellationToken): vsc.Definition {
		const match = this.htmlDocumentHelper.parseAtPosition(document, position);

		if (match) {
			const component = this.components.find(c => c.htmlName === match.tag);
			if (component) {
				const binding = component.bindings.find(b => b.htmlName === match.word);
				if (binding) {
					return getLocation({ path: component.path, pos: binding.pos });
				}

				if (match.word === component.htmlName) {
					const config = this.getConfig();
					const componentParts = config.get('goToDefinition') as string[] || [];

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
