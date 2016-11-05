import * as vsc from 'vscode';
import * as _ from 'lodash';
import { Component } from './component';
import { ComponentScanner } from './componentScanner';

const REGEX_TAG_NAME = /<([a-z-]+)/i;
const REGEX_TAG = /^<[a-z-]*$/i;
const REGEX_ATTRIBUTE_NAME = /([a-z-]+)=/gi;

export class CompletionProvider implements vsc.CompletionItemProvider {
	private scanner: ComponentScanner;

	constructor() {
		this.scanner = new ComponentScanner();
		this.scanner.init(vsc.workspace.rootPath);
	}

	public scan = async () => {
		await this.scanner.findFiles();
	}

	public provideCompletionItems = (document: vsc.TextDocument, position: vsc.Position/*, token: vsc.CancellationToken*/): vsc.CompletionItem[] => {
		let hasOpeningTagBefore = false;

		let bracketsBeforeCursor = this.findTagBrackets(document, position, 'backward');
		let bracketsAfterCursor = this.findTagBrackets(document, position, 'forward');

		if (bracketsBeforeCursor.opening && (!bracketsBeforeCursor.closing || bracketsBeforeCursor.closing.isBefore(bracketsBeforeCursor.opening))) {
			// get everything from starting < tag till the cursor
			let openingTagTextRange = new vsc.Range(bracketsBeforeCursor.opening, position);
			let text = document.getText(openingTagTextRange);

			if (text.startsWith("</")) {
				return []; // we don't complete anything in closing tag
			}

			if (REGEX_TAG.test(text)) {
				hasOpeningTagBefore = true;
			}
		}

		if (this.isInsideAClosedTag(bracketsBeforeCursor, bracketsAfterCursor)) {
			// get everything from starting < tag till ending >
			let tagTextRange = new vsc.Range(bracketsBeforeCursor.opening, bracketsAfterCursor.closing);
			let text = document.getText(tagTextRange);

			let { tag, attributes } = this.parseTag(text);

			let component = this.scanner.components.find(c => c.htmlName === tag);
			if (component) {
				return this.provideAttributeCompletions(component, attributes);
			}

			return [];
		}

		let currentCharacter = document.lineAt(position).text.charAt(position.character);

		return this.provideTagCompletions(hasOpeningTagBefore, currentCharacter === '<', position);
	}

	// TODO: refactor these helper methods to another class - not strictly related to auto-completion, seems like generic functions
	private findTagBrackets = (document: vsc.TextDocument, startFrom: vsc.Position, direction: 'backward' | 'forward'): BracketsPosition => {
		let openingPosition: vsc.Position;
		let closingPosition: vsc.Position;
		let linesToSearch: number[];
		let searchFunc: (searchString: string, position?: number) => number;

		if (direction === 'backward') {
			// skip cursor position when searching backwards
			startFrom = this.getPreviousCharacterPosition(document, startFrom);
			if (!startFrom) {
				return {
					opening: undefined,
					closing: undefined
				};
			}
			linesToSearch = _.rangeRight(startFrom.line + 1);
			searchFunc = String.prototype.lastIndexOf;
		} else {
			linesToSearch = _.range(startFrom.line, document.lineCount);
			searchFunc = String.prototype.indexOf;
		}

		let startPosition = startFrom.character;

		while (linesToSearch.length > 0) {
			let line = document.lineAt(linesToSearch.shift());

			let openingTag = searchFunc.apply(line.text, ["<", startPosition]);
			let closingTag = searchFunc.apply(line.text, [">", startPosition]);

			startPosition = undefined; // should be applied only to first searched line

			if (!openingPosition && openingTag > -1) {
				openingPosition = new vsc.Position(line.lineNumber, openingTag);
			}

			if (!closingPosition && closingTag > -1) {
				closingPosition = new vsc.Position(line.lineNumber, closingTag);
			}

			if (openingPosition && closingPosition) {
				break;
			}
		}

		return {
			opening: openingPosition,
			closing: closingPosition
		};
	}

	private getPreviousCharacterPosition = (document: vsc.TextDocument, startFrom: vsc.Position) => {
		if (startFrom.character === 0) {
			if (startFrom.line === 0) {
				return undefined;
			}
			return document.lineAt(startFrom.line - 1).range.end;
		} else {
			return startFrom.translate(undefined, -1);
		}
	}

	private parseTag = (text: string) => {
		let match: RegExpExecArray;
		match = REGEX_TAG_NAME.exec(text);
		let tag = match[1];

		let existingAttributes = [];

		// tslint:disable-next-line:no-conditional-assignment
		while (match = REGEX_ATTRIBUTE_NAME.exec(text)) {
			existingAttributes.push(match[1]);
		}

		return { tag, attributes: existingAttributes };
	}

	private isInsideAClosedTag = (beforeCursor: BracketsPosition, afterCursor: BracketsPosition) => {
		return beforeCursor.opening && (!beforeCursor.closing || beforeCursor.closing.isBefore(beforeCursor.opening))
			&& afterCursor.closing && (!afterCursor.opening || afterCursor.closing.isBefore(afterCursor.opening));
	}

	private provideAttributeCompletions = (component: Component, existingAttributes: string[]): vsc.CompletionItem[] => {
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

	private provideTagCompletions = (hasOpeningTagBefore: boolean, hasOpeningTagAfter: boolean, position: vsc.Position): vsc.CompletionItem[] => {
		return this.scanner.components.map(c => {
			let bindings = c.bindings.map(b => `${b.htmlName}=""`).join(' ');

			let item = new vsc.CompletionItem(c.htmlName, vsc.CompletionItemKind.Class);
			item.insertText = `<${c.htmlName} ${bindings.trim()}></${c.htmlName}>`;

			if (c.bindings.length > 0) {
				item.documentation = "Component bindings:\n"
					+ c.bindings.map(b => `  ${b.htmlName}: ${b.type}`).join("\n");
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

type BracketsPosition = { opening: vsc.Position, closing: vsc.Position };
