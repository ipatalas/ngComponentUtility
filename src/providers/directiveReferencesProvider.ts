import * as vsc from 'vscode';
import { IHtmlReferences } from '../utils/htmlTemplate/types';
import { convertHtmlReferencesToLocations } from '../utils/vsc';
import { Directive } from '../utils/directive/directive';

export class DirectiveReferencesProvider implements vsc.ReferenceProvider {
	private htmlReferences: IHtmlReferences;
	private directives: Directive[];

	public load = (references: IHtmlReferences, directives: Directive[]) => {
		this.htmlReferences = references;
		this.directives = directives;
	}

	public provideReferences(document: vsc.TextDocument, position: vsc.Position, _context: vsc.ReferenceContext, _token: vsc.CancellationToken): vsc.Location[] {
		const wordPos = document.getWordRangeAtPosition(position);
		const word = document.getText(wordPos);

		const directive = this.directives.find(d => d.name === word || d.className === word);
		if (directive) {
			const references = this.htmlReferences[directive.htmlName];
			if (references) {
				return convertHtmlReferencesToLocations(references);
			}
		}

		return [];
	}
}
