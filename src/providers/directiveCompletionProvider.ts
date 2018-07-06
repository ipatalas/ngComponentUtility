import * as vsc from 'vscode';
import { HtmlDocumentHelper } from '../utils/htmlDocumentHelper';
import { Directive } from '../utils/directive/directive';

export class DirectiveCompletionProvider implements vsc.CompletionItemProvider {
	private directives: Directive[];

	constructor(private htmlDocumentHelper: HtmlDocumentHelper) { }

	public loadDirectives = (directives: Directive[]) => {
		this.directives = directives;
	}

	public provideCompletionItems = (document: vsc.TextDocument, position: vsc.Position, _token: vsc.CancellationToken): vsc.CompletionItem[] => {
		const completionInfo = this.htmlDocumentHelper.prepareElementAttributeCompletion(document, position);

		if (completionInfo.inClosingTag) {
			return []; // we don't complete anything in closing tag
		}

		if (completionInfo.tag) {
			return this.directives.filter(d => d.isAttributeDirective).map(this.buildCompletionItem);
		}

		if (completionInfo.hasOpeningTagBefore) {
			return this.directives.filter(d => d.isElementDirective).map(d => this.buildCompletionItem(d));
		}

		return [];
	}

	private buildCompletionItem = (d: Directive) => {
		const item = new vsc.CompletionItem(d.htmlName, vsc.CompletionItemKind.Interface);
		item.insertText = d.htmlName;
		item.detail = 'Directive';
		item.label = d.htmlName;

		return item;
	}
}
