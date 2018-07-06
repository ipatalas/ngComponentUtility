import * as vsc from 'vscode';
import * as _ from 'lodash';
import { Component } from '../utils/component/component';
import { HtmlDocumentHelper } from '../utils/htmlDocumentHelper';

export class ComponentCompletionProvider implements vsc.CompletionItemProvider {
	private components: Component[];

	constructor(private htmlDocumentHelper: HtmlDocumentHelper) { }

	public loadComponents = (components: Component[]) => {
		this.components = components;
	}

	public provideCompletionItems = (document: vsc.TextDocument, position: vsc.Position, _token: vsc.CancellationToken): vsc.CompletionItem[] => {
		const completionInfo = this.htmlDocumentHelper.prepareElementAttributeCompletion(document, position);

		if (completionInfo.inClosingTag) {
			return []; // we don't complete anything in closing tag
		}

		if (completionInfo.tag) {
			const component = this.components.find(c => c.htmlName === completionInfo.tag);
			if (component) {
				return this.provideAttributeCompletions(component, completionInfo.attributes);
			}

			return [];
		}

		return this.provideTagCompletions(completionInfo.hasOpeningTagBefore, position);
	}

	private provideAttributeCompletions = (component: Component, existingAttributes: string[]): vsc.CompletionItem[] => {
		const attributes = _(existingAttributes);

		return component.bindings
			.filter(b => !attributes.includes(b.htmlName))
			.map(b => {
				const item = new vsc.CompletionItem(b.htmlName, vsc.CompletionItemKind.Field);
				item.insertText = new vsc.SnippetString(`${b.htmlName}="$1"$0`);
				item.detail = 'Component binding';
				item.documentation = `Binding type: ${b.type}`;
				item.label = ` ${b.htmlName}`; // space at the beginning so that these bindings are first on the list

				return item;
			});
	}

	private provideTagCompletions = (hasOpeningTagBefore: boolean, position: vsc.Position): vsc.CompletionItem[] => {
		return this.components.map(c => {
			const bindings = c.bindings.map(b => `${b.htmlName}=""`).join(' ');

			const item = new vsc.CompletionItem(c.htmlName, vsc.CompletionItemKind.Class);
			item.insertText = `<${c.htmlName} ${bindings.trim()}></${c.htmlName}>`;

			if (c.bindings.length > 0) {
				item.documentation = 'Component bindings:\n'
					+ c.bindings.map(b => `  ${b.htmlName}: ${b.type}`).join('\n');
			}

			item.additionalTextEdits = [];

			if (hasOpeningTagBefore) {
				item.additionalTextEdits.push(vsc.TextEdit.delete(new vsc.Range(position.translate(0, -1), position)));
			}

			return item;
		});
	}
}
