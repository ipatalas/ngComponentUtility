import * as vsc from 'vscode';
import * as _ from 'lodash';

const REGEX_TAG_NAME = /<\/?([a-z-]+)/i;
const REGEX_ATTRIBUTE_NAME = /([a-z-]+)=/gi;

export type BracketsPosition = { opening: vsc.Position, closing: vsc.Position };

export class HtmlDocumentHelper {
	public static findTagBrackets = (document: vsc.TextDocument, startFrom: vsc.Position, direction: 'backward' | 'forward'): BracketsPosition => {
		let openingPosition: vsc.Position;
		let closingPosition: vsc.Position;
		let linesToSearch: number[];
		let searchFunc: (searchString: string, position?: number) => number;

		if (direction === 'backward') {
			// skip cursor position when searching backwards
			startFrom = HtmlDocumentHelper.getPreviousCharacterPosition(document, startFrom);
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

	public static getPreviousCharacterPosition = (document: vsc.TextDocument, startFrom: vsc.Position) => {
		if (startFrom.character === 0) {
			if (startFrom.line === 0) {
				return undefined;
			}
			return document.lineAt(startFrom.line - 1).range.end;
		} else {
			return startFrom.translate(undefined, -1);
		}
	}

	public static parseTag = (text: string) => {
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

	public static isInsideAClosedTag = (beforeCursor: BracketsPosition, afterCursor: BracketsPosition) => {
		return beforeCursor.opening && (!beforeCursor.closing || beforeCursor.closing.isBefore(beforeCursor.opening))
			&& afterCursor.closing && (!afterCursor.opening || afterCursor.closing.isBefore(afterCursor.opening));
	}
}
