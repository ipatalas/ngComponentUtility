import * as vsc from 'vscode';
import * as path from 'path';

import { Component } from '../utils/component/component';
import { getLocation } from '../utils/vsc';

export class MemberDefinitionProvider implements vsc.DefinitionProvider {
	private components = new Map<string, Component>();

	public loadComponents = (components: Component[]) => {
		this.components.clear();
		components.forEach(c => {
			this.components.set(this.normalizePath(c.template.path), c);
		});
	}

	public provideDefinition(document: vsc.TextDocument, position: vsc.Position, _token: vsc.CancellationToken): vsc.Definition {
		let normalizedPath = this.normalizePath(document.uri.fsPath);

		if (!this.components.has(normalizedPath)) {
			return [];
		}

		let component = this.components.get(normalizedPath);

		let line = document.lineAt(position.line).text;
		let dotIdx = line.lastIndexOf('.', position.character);
		let viewModelName = line.substring(dotIdx - component.controllerAs.length, dotIdx);

		if (viewModelName === component.controllerAs) {
			let range = document.getWordRangeAtPosition(position);
			let word = document.getText(range);

			let member = component.controller.members.find(m => m.name === word);
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
