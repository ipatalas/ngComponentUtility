import * as vsc from 'vscode';
import * as path from 'path';

import { IComponentBase } from '../utils/component/component';
import { getLocation } from '../utils/vsc';

export class MemberDefinitionProvider implements vsc.DefinitionProvider {
	private components = new Map<string, IComponentBase>();

	public loadComponents = (components: IComponentBase[]) => {
		this.components = new Map<string, IComponentBase>(
			components.filter(c => c.template).map(c => <[string, IComponentBase]>[this.normalizePath(c.template.path), c])
		);
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

			if (component.controller) {
				const member = component.controller.getMembers(false).find(m => m.name === word);
				if (member) {
					return getLocation({
						path: member.controller.path,
						pos: member.pos
					});
				}
			}

			const binding = component.getBindings().find(b => b.name === word);
			if (binding) {
				return getLocation({
					path: component.path,
					pos: binding.pos
				});
			}
		}

		return [];
	}

	private normalizePath = (p: string) => path.normalize(p).toUpperCase();
}
