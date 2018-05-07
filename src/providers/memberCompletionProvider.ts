import * as path from 'path';
import * as vsc from 'vscode';
import { IComponentBase } from '../utils/component/component';
import * as _ from 'lodash';

export class MemberCompletionProvider implements vsc.CompletionItemProvider {
	private components = new Map<string, IComponentBase>();

	public loadComponents = (components: IComponentBase[]) => {
		this.components = new Map<string, IComponentBase>(
			components.filter(c => c.template).map(c => <[string, IComponentBase]>[this.normalizePath(c.template.path), c])
		);
	}

	public provideCompletionItems = (document: vsc.TextDocument, position: vsc.Position, _token: vsc.CancellationToken): vsc.CompletionItem[] => {
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

			let members = component.controller && component.controller.members.filter(m => !excludedMembers.test(m.name)) || [];
			if (publicOnly) {
				members = members.filter(m => m.isPublic);
			}

			const bindings = component.getBindings();

			return _.uniqBy([
				...members.map(member => member.buildCompletionItem(bindings)),
				...bindings.map(b => b.buildCompletionItem())
			], item => item.label);
		}

		return [new vsc.CompletionItem(component.controllerAs, vsc.CompletionItemKind.Field)];
	}

	private normalizePath = (p: string) => path.normalize(p).toUpperCase();
}
