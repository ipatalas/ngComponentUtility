import * as path from 'path';
import * as vsc from 'vscode';
import * as _ from 'lodash';
import { Component } from '../utils/component';

export class MemberCompletionProvider implements vsc.CompletionItemProvider {
	private components = new Map<string, Component>();

	public loadComponents = (components: Component[]) => {
		this.components.clear();
		components.forEach(c => {
			this.components.set(this.normalizePath(c.template.path), c);
		});
	}

	public provideCompletionItems = (document: vsc.TextDocument, position: vsc.Position/*, token: vsc.CancellationToken*/): vsc.CompletionItem[] => {
		let normalizedPath = this.normalizePath(document.uri.fsPath);

		if (!this.components.has(normalizedPath)) {
			return [];
		}

		let component = this.components.get(normalizedPath);

		let line = document.lineAt(position.line).text;
		let dotIdx = line.lastIndexOf('.', position.character);
		let viewModelName = line.substring(dotIdx - component.controllerAs.length, dotIdx);

		if (viewModelName === component.controllerAs) {
			const config = vsc.workspace.getConfiguration("ngComponents");
			const publicOnly = <boolean>config.get("controller.publicMembersOnly");
			const excludedMembers = new RegExp(<string>config.get("controller.excludedMembers"));

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
