import * as path from 'path';
import * as vsc from 'vscode';
import { HtmlDocumentHelper } from '../utils/htmlDocumentHelper';
import { IHtmlReferences, IHtmlReference } from '../utils/htmlTemplate/types';
import { getLocation, angularRoot } from '../utils/vsc';
import { Component } from '../utils/component/component';
type DocumentHandlerDelegate = (document: vsc.TextDocument, position: vsc.Position) => vsc.Location[];

export class ReferencesProvider implements vsc.ReferenceProvider {

	private htmlReferences: IHtmlReferences;
	private components: Component[];
	private documentHandlers: Map<string, DocumentHandlerDelegate>;

	constructor(private htmlDocumentHelper: HtmlDocumentHelper) {
		this.documentHandlers = new Map<string, DocumentHandlerDelegate>([
			['html', this.provideHtmlReferences],
			['typescript', this.provideControllerReferences]
		]);
	}

	public load = (references: IHtmlReferences, components: Component[]) => {
		this.htmlReferences = references;
		this.components = components;
	}

	// tslint:disable-next-line:member-access
	provideReferences(document: vsc.TextDocument, position: vsc.Position, _context: vsc.ReferenceContext, _token: vsc.CancellationToken): vsc.Location[] {
		const handler = this.documentHandlers.get(document.languageId);
		if (handler) {
			return handler(document, position);
		}

		return [];
	}

	private provideControllerReferences = (document: vsc.TextDocument, position: vsc.Position): vsc.Location[] => {
		const wordPos = document.getWordRangeAtPosition(position);
		const word = document.getText(wordPos);

		const component = this.components.find(c => (c.controller && c.controller.className === word) || c.name === word);
		if (component) {
			const references = this.htmlReferences[component.htmlName];
			if (references) {
				return this.convertReferencesToLocations(references);
			}
		}

		return [];
	}

	private provideHtmlReferences = (document: vsc.TextDocument, position: vsc.Position): vsc.Location[] => {
		const bracketsBeforeCursor = this.htmlDocumentHelper.findTagBrackets(document, position, 'backward');
		const bracketsAfterCursor = this.htmlDocumentHelper.findTagBrackets(document, position, 'forward');

		if (this.htmlDocumentHelper.isInsideAClosedTag(bracketsBeforeCursor, bracketsAfterCursor)) {
			const wordPos = document.getWordRangeAtPosition(position);
			const componentName = document.getText(wordPos);

			const componentReferences = this.htmlReferences[componentName];
			if (componentReferences) {
				return this.convertReferencesToLocations(componentReferences);
			}
		}

		return [];
	}

	private convertReferencesToLocations = (references: IHtmlReference[]): vsc.Location[] => {
		return references.map(ref => getLocation({
			path: path.join(angularRoot, ref.relativeHtmlPath),
			pos: {
				line: ref.line,
				character: ref.character
			}
		}));
	}
}
