import * as vsc from 'vscode';
import { IComponentBinding } from './component';
import { ComponentScanner } from './componentScanner';

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
		let hasOpeningTag = false;

		let line = document.lineAt(position.line);
		let openingTag = line.text.lastIndexOf("<", position.character);
		let closingTag = line.text.indexOf(">", position.character);

		if (openingTag > -1) {
			// get everything from starting < tag till the cursor
			let openingTagTextRange = new vsc.Range(position.with(undefined, openingTag), position);
			let text = document.getText(openingTagTextRange);

			if (/^<[a-z]*$/i.test(text)) {
				hasOpeningTag = true;
			}
		}

		// let range = document.getWordRangeAtPosition(position);
		// let text = document.getText(range);

		return this.scanner.components.map(
			(c, i): any => {
				var bindings: string = "";
				c.bindings.forEach(p => {
					bindings += `${p.htmlName}="" `;
				});

				let item = new vsc.CompletionItem(c.htmlName, vsc.CompletionItemKind.Class);
				item.insertText = `<${c.htmlName} ${bindings.trim()}></${c.htmlName}>`;

				if (c.bindings.length > 0) {
					item.documentation = c.bindings.reduce((acc: string, current: IComponentBinding) => {
						return acc + `  ${current.htmlName}: ${current.type}\n`;
					}, "Component bindings:\n");
				}

				if (hasOpeningTag) {
					item.additionalTextEdits = [
						vsc.TextEdit.delete(new vsc.Range(position.translate(0, -1), position))
					];
				}

				return item;
			});
	}
}