import * as vsc from 'vscode';

import { HtmlDocumentHelper } from '../utils/htmlDocumentHelper';
import { getLocation } from '../utils/vsc';
import { Directive } from '../utils/directive/directive';

export class DirectiveDefinitionProvider implements vsc.DefinitionProvider {
	private directives: Directive[];

	constructor(private htmlDocumentHelper: HtmlDocumentHelper) {}

	public loadDirectives = (directives: Directive[]) => {
		this.directives = directives;
	}

	public provideDefinition(document: vsc.TextDocument, position: vsc.Position, _token: vsc.CancellationToken): vsc.Definition {
		const match = this.htmlDocumentHelper.parseAtPosition(document, position);

		if (match) {
			const directive = this.directives.find(c => c.htmlName === match.word);
			if (directive) {
				return getLocation({ path: directive.path, pos: directive.pos });
			}
		}

		return [];
	}
}
