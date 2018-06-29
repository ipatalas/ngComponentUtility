import * as vsc from 'vscode';
import * as _ from 'lodash';

const REGEX_TAG_NAME = /<\/?([a-z0-9-]+)/i;
const REGEX_ATTRIBUTE_NAME = /([a-z-]+)=/gi;

export interface IBracketsPosition {
	opening: vsc.Position;
	closing: vsc.Position;
}

export class HtmlDocumentHelper {
	public findTagBrackets = (document: vsc.TextDocument, startFrom: vsc.Position, direction: 'backward' | 'forward'): IBracketsPosition => {
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
			const line = document.lineAt(linesToSearch.shift());

			const openingTag = searchFunc.apply(line.text, ['<', startPosition]);
			const closingTag = searchFunc.apply(line.text, ['>', startPosition]);

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

	public getPreviousCharacterPosition = (document: vsc.TextDocument, startFrom: vsc.Position) => {
		if (startFrom.character === 0) {
			if (startFrom.line === 0) {
				return undefined;
			}
			return document.lineAt(startFrom.line - 1).range.end;
		} else {
			return startFrom.translate(undefined, -1);
		}
	}

	public parseTag = (text: string) => {
		let match: RegExpExecArray;
		match = REGEX_TAG_NAME.exec(text);
		const tag = match[1];

		const existingAttributes = [];

		// tslint:disable-next-line:no-conditional-assignment
		while (match = REGEX_ATTRIBUTE_NAME.exec(text)) {
			existingAttributes.push(match[1]);
		}

		return { tag, attributes: existingAttributes };
	}

	public isInsideAClosedTag = (beforeCursor: IBracketsPosition, afterCursor: IBracketsPosition) => {
		return beforeCursor.opening && (!beforeCursor.closing || beforeCursor.closing.isBefore(beforeCursor.opening))
			&& afterCursor.closing && (!afterCursor.opening || afterCursor.closing.isBefore(afterCursor.opening));
	}

	public parseAtPosition = (document: vsc.TextDocument, position: vsc.Position) => {
		const bracketsBeforeCursor = this.findTagBrackets(document, position, 'backward');
		const bracketsAfterCursor = this.findTagBrackets(document, position, 'forward');

		if (this.isInsideAClosedTag(bracketsBeforeCursor, bracketsAfterCursor)) {
			// get everything from starting < tag till ending >
			const tagTextRange = new vsc.Range(bracketsBeforeCursor.opening, bracketsAfterCursor.closing);
			const text = document.getText(tagTextRange);

			const wordPos = document.getWordRangeAtPosition(position);
			const word = document.getText(wordPos);

			const { tag } = this.parseTag(text);

			return { word, tag };
		}
	}
}
