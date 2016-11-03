import * as vsc from 'vscode';
import * as _ from 'lodash';
import { IComponentBinding, Component } from './component';
import { ComponentScanner } from './componentScanner';

const REGEX_TAG_NAME = /<([a-z-]+)/i;
const REGEX_ATTRIBUTE_NAME = /([a-z-]+)=/gi;

export class CompletionProvider implements vsc.CompletionItemProvider {
	private scanner: ComponentScanner;

	constructor() {
		this.scanner = new ComponentScanner();
		this.scanner.init(vsc.workspace.rootPath);
	}

	scan = async () => {
		await this.scanner.findFiles();
	}

	provideCompletionItems = (document: vsc.TextDocument, position: vsc.Position, token: vsc.CancellationToken): vsc.CompletionItem[] | Thenable<vsc.CompletionItem[]> | vsc.CompletionList | Thenable<vsc.CompletionList> => {
		let line = document.lineAt(position.line);

		let openingTagBefore = line.text.lastIndexOf("<", position.character);
		let closingTagBefore = line.text.lastIndexOf(">", position.character);

		let openingTagAfter = line.text.indexOf("<", position.character);
		let closingTagAfter = line.text.indexOf(">", position.character);

		// TODO:
		// - handle closing tag - should not show any completions
		// - handle cursor between two html tags

		if (this.isInsideATag(openingTagBefore, closingTagBefore, openingTagAfter, closingTagAfter)) {
			// get everything from starting < tag till the cursor
			let tagTextRange = new vsc.Range(position.with(undefined, openingTagBefore), position.with(undefined, closingTagAfter + 1));
			let text = document.getText(tagTextRange);

			let { tag, attributes } = this.parseTag(text);

			let component = this.scanner.components.find(c => c.htmlName === tag);
			if (component) {
				return this.provideAttributeCompletions(component, attributes);
			}

			return [];
		}

		return this.provideTagCompletions(document, position, openingTagBefore);
	}

	private parseTag = (text: string) => {
		let match: RegExpExecArray;
		match = REGEX_TAG_NAME.exec(text);
		let tag = match[1];

		let existingAttributes = [];
		while (match = REGEX_ATTRIBUTE_NAME.exec(text)) {
			existingAttributes.push(match[1]);
		}

		return { tag, attributes: existingAttributes };
	}

	private isInsideATag = (openingTagBefore: number, closingTagBefore: number, openingTagAfter: number, closingTagAfter: number) => {
		return openingTagBefore > -1 && closingTagAfter > -1;
	}

	provideAttributeCompletions = (component: Component, existingAttributes: string[]): vsc.CompletionItem[] => {
		let attributes = _(existingAttributes);

		return component.bindings
			.filter(b => !attributes.includes(b.htmlName))
			.map(b => {
				let item = new vsc.CompletionItem(b.htmlName, vsc.CompletionItemKind.Field);
				item.insertText = `${b.htmlName}=""`;
				item.detail = "Component binding";
				item.documentation = `Binding type: ${b.type}`;
				item.label = ` ${b.htmlName}`; // space at the beginning so that these bindings are first on the list

				return item;
			});
	}

	provideTagCompletions = (document: vsc.TextDocument, position: vsc.Position, openingTagBeforeCursor: number): vsc.CompletionItem[] => {
		let removeOpeningTag = false;

		if (openingTagBeforeCursor > -1) {
			// get everything from starting < tag till the cursor
			let openingTagTextRange = new vsc.Range(position.with(undefined, openingTagBeforeCursor), position);
			let text = document.getText(openingTagTextRange);

			if (/^<[a-z]*$/i.test(text)) {
				removeOpeningTag = true;
			}
		}

		return this.scanner.components.map(c => {
			var bindings = c.bindings.map(b => `${b.htmlName}=""`).join(' ');

			let item = new vsc.CompletionItem(c.htmlName, vsc.CompletionItemKind.Class);
			item.insertText = `<${c.htmlName} ${bindings.trim()}></${c.htmlName}>`;

			if (c.bindings.length > 0) {
				item.documentation = "Component bindings:\n"
					+ c.bindings.map(b => `  ${b.htmlName}: ${b.type}`).join("\n");
			}

			if (removeOpeningTag) {
				item.additionalTextEdits = [
					vsc.TextEdit.delete(new vsc.Range(position.translate(0, -1), position))
				];
			}

			return item;
		});
	}
}