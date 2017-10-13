import * as path from 'path';
import * as vsc from 'vscode';
import { Component } from '../utils/component/component';

export class MemberCompletionProvider implements vsc.CompletionItemProvider {
	private components = new Map<string, Component>();

	public loadComponents = (components: Component[]) => {
		this.components.clear();
		components.filter(c => c.template).forEach(c => {
			this.components.set(this.normalizePath(c.template.path), c);
		});
	}

	public provideCompletionItems = (document: vsc.TextDocument, position: vsc.Position/*, token: vsc.CancellationToken*/): vsc.CompletionItem[] => {
		const normalizedPath = this.normalizePath(document.uri.fsPath);

		if (!this.components.has(normalizedPath)) {
			return [];
		}

		const component = this.components.get(normalizedPath);

		const line = document.lineAt(position.line).text;
		const dotIdx = line.lastIndexOf('.', position.character);
		const charsBetweenTheDotAndTheCursor = line.substring(dotIdx + 1, position.character);
		const viewModelName = line.substring(dotIdx - component.controllerAs.length, dotIdx);

		if (viewModelName === component.controllerAs && /^([a-z]+)?$/i.test(charsBetweenTheDotAndTheCursor)) {
			const config = vsc.workspace.getConfiguration('ngComponents');
			const publicOnly = config.get('controller.publicMembersOnly') as boolean;
			const excludedMembers = new RegExp(config.get('controller.excludedMembers') as string);

			let members = component.controller.members.filter(m => !excludedMembers.test(m.name));
			if (publicOnly) {
				members = members.filter(m => m.isPublic);
			}

			return members.map(member => member.buildCompletionItem());
		}

		return [new vsc.CompletionItem(component.controllerAs, vsc.CompletionItemKind.Field)];
	}

	private normalizePath = (p: string) => path.normalize(p).toUpperCase();
}
