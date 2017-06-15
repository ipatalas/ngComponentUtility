import * as vsc from 'vscode';
import * as path from 'path';

import { Component } from '../utils/component/component';
import { getLocation } from '../utils/vsc';

export class MemberDefinitionProvider implements vsc.DefinitionProvider {
	private components = new Map<string, Component>();

	public loadComponents = (components: Component[]) => {
		this.components.clear();
		components.filter(c => c.template).forEach(c => {
			this.components.set(this.normalizePath(c.template.path), c);
		});
	}

	public provideDefinition(document: vsc.TextDocument, position: vsc.Position, _token: vsc.CancellationToken): vsc.Definition {
		const normalizedPath = this.normalizePath(document.uri.fsPath);

		if (!this.components.has(normalizedPath)) {
			return [];
		}

		const component = this.components.get(normalizedPath);

		const line = document.lineAt(position.line).text;
		const dotIdx = line.lastIndexOf('.', position.character);
		const viewModelName = line.substring(dotIdx - component.controllerAs.length, dotIdx);

		if (viewModelName === component.controllerAs) {
			const range = document.getWordRangeAtPosition(position);
			const word = document.getText(range);

			const member = component.controller.members.find(m => m.name === word);
			if (member) {
				return getLocation({
					path: component.controller.path,
					pos: member.pos
				});
			}
		}

		return [];
	}

	private normalizePath = (p: string) => path.normalize(p).toUpperCase();
}
