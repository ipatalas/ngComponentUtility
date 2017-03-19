import * as path from 'path';
import * as _ from 'lodash';
import * as vsc from 'vscode';
import { HtmlDocumentHelper } from '../utils/htmlDocumentHelper';
import { IHtmlReferences, IComponentReference, IComponentReferences } from "../utils/htmlReferencesCache";
import { getLocation, workspaceRoot } from "../utils/vsc";
import { Component } from "../utils/component";
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
	// tslint:disable-next-line:max-line-length
	// tslint:disable-next-line:member-access
	provideReferences(document: vsc.TextDocument, position: vsc.Position, _context: vsc.ReferenceContext, _token: vsc.CancellationToken): vsc.Location[] | Thenable<vsc.Location[]> {
		let handler = this.documentHandlers.get(document.languageId);
		if (handler) {
			_context.includeDeclaration = false;
			return handler(document, position);
		}

		return [];
	}

	private provideControllerReferences = (document: vsc.TextDocument, position: vsc.Position): vsc.Location[] => {
		let wordPos = document.getWordRangeAtPosition(position);
		let word = document.getText(wordPos);

		let component = this.components.find(c => (c.controller && c.controller.className === word) || c.name === word);
		if (component) {
			let references = this.htmlReferences[component.htmlName];
			if (references) {
				return this.convertReferencesToLocations(references);
			}
		}

		return [];
	}

	private provideHtmlReferences = (document: vsc.TextDocument, position: vsc.Position): vsc.Location[] => {
		let bracketsBeforeCursor = HtmlDocumentHelper.findTagBrackets(document, position, 'backward');
		let bracketsAfterCursor = HtmlDocumentHelper.findTagBrackets(document, position, 'forward');

		if (HtmlDocumentHelper.isInsideAClosedTag(bracketsBeforeCursor, bracketsAfterCursor)) {
			let wordPos = document.getWordRangeAtPosition(position);
			let word = document.getText(wordPos);

			let references = this.htmlReferences[word];
			if (references) {
				return this.convertReferencesToLocations(references);
			}
		}

		return [];
	}

	private convertReferencesToLocations = (references: IComponentReferences): vsc.Location[] => {
		return _(references)
			.toPairs()
			.flatMap((item: [string, IComponentReference[]]) => {
				let [relativePath, matches] = item;
				return matches.map(pos => ({
					path: path.join(workspaceRoot, relativePath),
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
