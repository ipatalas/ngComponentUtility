import * as vsc from 'vscode';
import { Component } from '../utils/component';
import * as _ from 'lodash';

export class BindingProvider implements vsc.CompletionItemProvider {
	private components: Component[];

	public loadComponents = (components: Component[]) => {
		this.components = components;
	}
	public provideCompletionItems = (document: vsc.TextDocument, position: vsc.Position/*, token: vsc.CancellationToken*/): vsc.CompletionItem[] => {
		let line = document.lineAt(position.line).text;
		let startIndex = line.indexOf(',') - 1;
		let isAllowedCharacter = /[a-z-]/i;

		for (let i = startIndex; i >= 0; i--) {
			if (!isAllowedCharacter.test(line[i])) {
				startIndex = i + 1;
				break;
			}
			startIndex = 0;
		}

		let firstCommaIndex = line.indexOf(',', startIndex);
		let lastCommaIndex = line.lastIndexOf(',');
		let componentName = line.substring(startIndex, firstCommaIndex);

		let component = this.components.find(x => x.htmlName === componentName);

		if (!component) {
			return [];
		}

		let existingBindings = {};
		if (firstCommaIndex !== lastCommaIndex) {
			let existing = line.substring(firstCommaIndex + 1, lastCommaIndex).split(',');
			existing.forEach(b => {
				let split = b.split('=');
				let value = split[1] || '';
				if (!value) {
					// tslint:disable-next-line:no-shadowed-variable
					let binding = component.bindings.find(b => b.htmlName === split[0]);
					if (binding) {
						value = `${component.controllerAs}.${binding.name}`;
					}
				} else if (!value.startsWith(component.controllerAs)) {
					value = `${component.controllerAs}.${value}`;
				}

				existingBindings[split[0]] = value;
			});
		}

		return this.provideBindingCompletions(component, existingBindings, position, startIndex);
	}

	private provideBindingCompletions = (component: Component, existingBindings: Object, position: vsc.Position, startIndex: number): vsc.CompletionItem[] => {
		let attributes = _(Object.keys(existingBindings));

		let result = component.bindings
			.filter(b => !attributes.includes(b.htmlName))
			.map(b => {
				let item = new vsc.CompletionItem(b.htmlName, vsc.CompletionItemKind.Field);
				item.insertText = `${b.htmlName}=`;
				item.detail = "Component binding";
				item.documentation = `Binding type: ${b.type}`;
				item.label = `  ${b.htmlName}`; // space at the beginning so that these bindings are first on the list

				return item;
			});

		let commandItem = new vsc.CompletionItem(' Resolve component', vsc.CompletionItemKind.Function);
		commandItem.insertText = `<${component.htmlName} ${attributes.map(key => key + '="' + existingBindings[key] + '"').join(' ')}></${component.htmlName}>`;
		commandItem.additionalTextEdits = [
			vsc.TextEdit.delete(new vsc.Range(position.line, startIndex, position.line, position.character))
		];

		result.push(commandItem);

		return result;
	}
}
