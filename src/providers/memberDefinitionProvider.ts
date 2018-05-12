import * as vsc from 'vscode';

import { IComponentBase } from '../utils/component/component';
import { getLocation } from '../utils/vsc';
import { ITemplateInfo, ITemplateInfoEntry } from '../utils/htmlTemplate/types';
import { RelativePath } from '../utils/htmlTemplate/relativePath';

export class MemberDefinitionProvider implements vsc.DefinitionProvider {
	private templateInfo: ITemplateInfo;
	private components = new Map<string, IComponentBase>();

	public loadComponents = (components: IComponentBase[], templateInfo: ITemplateInfo) => {
		this.templateInfo = templateInfo;
		this.components = new Map<string, IComponentBase>(
			components.filter(c => c.template).map(c => <[string, IComponentBase]>[new RelativePath(c.template.path).relativeLowercase, c])
		);
	}

	public provideDefinition(document: vsc.TextDocument, position: vsc.Position, _token: vsc.CancellationToken): vsc.Definition {
		const relativePath = RelativePath.fromUri(document.uri);
		const component = this.components.get(relativePath.relativeLowercase);

		if (!component) {
			return [];
		}

		const definitions: vsc.Location[] = [];

		const line = document.lineAt(position.line).text;
		const dotIdx = line.lastIndexOf('.', position.character);
		const viewModelName = line.substring(dotIdx - component.controllerAs.length, dotIdx);

		if (viewModelName === component.controllerAs) {
			const range = document.getWordRangeAtPosition(position);
			const word = document.getText(range);

			if (component.controller) {
				this.fillMemberDefinition(component, word, definitions);
			}

			if (definitions.length === 0) {
				this.fillBindingDefinition(component, word, definitions);
			}

			const templateForms = this.templateInfo[relativePath.relative];
			if (templateForms) {
				this.fillFormDefinition(templateForms, viewModelName, word, definitions, relativePath);
			}
		}

		return definitions;
	}

	private fillFormDefinition(templateForms: ITemplateInfoEntry, viewModelName: string, word: string, definitions: vsc.Location[], relativePath: RelativePath) {
		const matchingForm = templateForms.forms.find(f => f.name === `${viewModelName}.${word}`);
		if (matchingForm) {
			definitions.push(getLocation({
				path: relativePath.absolute,
				pos: matchingForm
			}));
		}
	}

	private fillMemberDefinition(component: IComponentBase, word: string, definitions: vsc.Location[]) {
		const member = component.controller.getMembers(false).find(m => m.name === word);
		if (member) {
			definitions.push(getLocation({
				path: member.controller.path,
				pos: member.pos
			}));
		}
	}

	private fillBindingDefinition(component: IComponentBase, word: string, definitions: vsc.Location[]) {
		const binding = component.getBindings().find(b => b.name === word);
		if (binding) {
			definitions.push(getLocation({
				path: component.path,
				pos: binding.pos
			}));
		}
	}
}
