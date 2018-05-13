import * as vsc from 'vscode';
import { IComponentBase } from '../utils/component/component';
import * as _ from 'lodash';
import { RelativePath } from '../utils/htmlTemplate/relativePath';

export class MemberCompletionProvider implements vsc.CompletionItemProvider {
	private components = new Map<string, IComponentBase>();

	constructor(private getConfig: () => vsc.WorkspaceConfiguration) {
	}

	public loadComponents = (components: IComponentBase[]) => {
		this.components = new Map<string, IComponentBase>(
			components.filter(c => c.template).map(c => <[string, IComponentBase]>[new RelativePath(c.template.path).relativeLowercase, c])
		);
	}

	public provideCompletionItems = (document: vsc.TextDocument, position: vsc.Position, _token: vsc.CancellationToken): vsc.CompletionItem[] => {
		const relativePath = RelativePath.fromUri(document.uri);
		const component = this.components.get(relativePath.relativeLowercase);

		if (!component) {
			return [];
		}

		const line = document.lineAt(position.line).text;
		const dotIdx = line.lastIndexOf('.', position.character);
		const charsBetweenTheDotAndTheCursor = line.substring(dotIdx + 1, position.character);
		const viewModelName = line.substring(dotIdx - component.controllerAs.length, dotIdx);

		if (viewModelName === component.controllerAs && /^([a-z]+)?$/i.test(charsBetweenTheDotAndTheCursor)) {
			const config = this.getConfig();
			const publicOnly = config.get<boolean>('controller.publicMembersOnly');
			const excludedMembers = new RegExp(config.get<string>('controller.excludedMembers'));

			const members = component.controller && component.controller.getMembers(publicOnly).filter(m => !excludedMembers.test(m.name)) || [];
			const bindings = component.getBindings();

			return _.uniqBy([
				...members.map(member => member.buildCompletionItem(bindings)),
				...bindings.map(b => b.buildCompletionItem())
			], item => item.label);
		}

		return [new vsc.CompletionItem(component.controllerAs, vsc.CompletionItemKind.Field)];
	}
}
