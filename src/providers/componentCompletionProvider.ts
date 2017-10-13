import * as vsc from 'vscode';
import * as _ from 'lodash';
import { Component } from '../utils/component/component';
import { HtmlDocumentHelper } from '../utils/htmlDocumentHelper';

const REGEX_TAG = /^<[a-z-]*$/i;

export class ComponentCompletionProvider implements vsc.CompletionItemProvider {
	private components: Component[];

	public loadComponents = (components: Component[]) => {
		this.components = components;
	}

	public provideCompletionItems = (document: vsc.TextDocument, position: vsc.Position/*, token: vsc.CancellationToken*/): vsc.CompletionItem[] => {
		let hasOpeningTagBefore = false;
		const bracketsBeforeCursor = HtmlDocumentHelper.findTagBrackets(document, position, 'backward');
		const bracketsAfterCursor = HtmlDocumentHelper.findTagBrackets(document, position, 'forward');

		if (bracketsBeforeCursor.opening && (!bracketsBeforeCursor.closing || bracketsBeforeCursor.closing.isBefore(bracketsBeforeCursor.opening))) {
			// get everything from starting < tag till the cursor
			const openingTagTextRange = new vsc.Range(bracketsBeforeCursor.opening, position);
			const text = document.getText(openingTagTextRange);

			if (text.startsWith('</')) {
				return []; // we don't complete anything in closing tag
			}

			if (REGEX_TAG.test(text)) {
				hasOpeningTagBefore = true;
			}
		}

		if (HtmlDocumentHelper.isInsideAClosedTag(bracketsBeforeCursor, bracketsAfterCursor)) {
			// get everything from starting < tag till ending >
			const tagTextRange = new vsc.Range(bracketsBeforeCursor.opening, bracketsAfterCursor.closing);
			const text = document.getText(tagTextRange);

			const { tag, attributes } = HtmlDocumentHelper.parseTag(text);

			const component = this.components.find(c => c.htmlName === tag);
			if (component) {
				return this.provideAttributeCompletions(component, attributes);
			}

			return [];
		}

		const currentCharacter = document.lineAt(position).text.charAt(position.character);

		return this.provideTagCompletions(hasOpeningTagBefore, currentCharacter === '<', position);
	}

	private provideAttributeCompletions = (component: Component, existingAttributes: string[]): vsc.CompletionItem[] => {
		const attributes = _(existingAttributes);

		return component.bindings
			.filter(b => !attributes.includes(b.htmlName))
			.map(b => {
				const item = new vsc.CompletionItem(b.htmlName, vsc.CompletionItemKind.Field);
				item.insertText = `${b.htmlName}=""`;
				item.detail = 'Component binding';
				item.documentation = `Binding type: ${b.type}`;
				item.label = ` ${b.htmlName}`; // space at the beginning so that these bindings are first on the list

				return item;
			});
	}

	private provideTagCompletions = (hasOpeningTagBefore: boolean, hasOpeningTagAfter: boolean, position: vsc.Position): vsc.CompletionItem[] => {
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

			if (hasOpeningTagAfter) {
				item.additionalTextEdits.push(vsc.TextEdit.insert(position.translate(undefined, 1), '<'));
			}

			return item;
		});
	}
}
