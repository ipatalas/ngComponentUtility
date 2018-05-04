import * as path from 'path';
import * as _ from 'lodash';
import * as vsc from 'vscode';
import { HtmlDocumentHelper } from '../utils/htmlDocumentHelper';
import { IHtmlReferences, IComponentReference, IComponentReferences } from '../utils/htmlTemplate/htmlTemplateInfoCache';
import { getLocation, angularRoot } from '../utils/vsc';
import { Component } from '../utils/component/component';
type DocumentHandlerDelegate = (document: vsc.TextDocument, position: vsc.Position) => vsc.Location[];

export class ReferencesProvider implements vsc.ReferenceProvider {

	private htmlReferences: IHtmlReferences;
	private components: Component[];
	private documentHandlers: Map<string, DocumentHandlerDelegate>;

	constructor() {
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
		const bracketsBeforeCursor = HtmlDocumentHelper.findTagBrackets(document, position, 'backward');
		const bracketsAfterCursor = HtmlDocumentHelper.findTagBrackets(document, position, 'forward');

		if (HtmlDocumentHelper.isInsideAClosedTag(bracketsBeforeCursor, bracketsAfterCursor)) {
			const wordPos = document.getWordRangeAtPosition(position);
			const componentName = document.getText(wordPos);

			const componentReferences = this.htmlReferences[componentName];
			if (componentReferences) {
				return this.convertReferencesToLocations(componentReferences);
			}
		}

		return [];
	}

	private convertReferencesToLocations = (references: IComponentReferences): vsc.Location[] => {
		return _(references)
			.toPairs()
			.flatMap((item: [string, IComponentReference[]]) => {
				const [relativePath, matches] = item;
				return matches.map(pos => ({
					path: path.join(angularRoot, relativePath),
					pos: {
						line: pos.line,
						character: pos.col
					}
				}));
			})
			.map(getLocation)
			.value();
	}
}
