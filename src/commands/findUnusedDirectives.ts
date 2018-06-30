import * as vsc from 'vscode';

import { Directive } from '../utils/directive/directive';
import { IHtmlReferences } from '../utils/htmlTemplate/types';
import { logError } from '../utils/logging';

export class FindUnusedDirectivesCommand {
	public execute = (htmlReferences: IHtmlReferences, directives: Directive[]) => {
		const usedDirectives = Object.keys(htmlReferences);
		const unusedDirectives = directives.filter(d => usedDirectives.indexOf(d.htmlName) === -1);

		if (unusedDirectives.length === 0) {
			vsc.window.showInformationMessage('All of your directives are used. Good for you :-)');
			return;
		}
		const items = unusedDirectives.map(d => ({ ...d, label: d.name, description: d.htmlName }));
		vsc.window.showQuickPick(items, { matchOnDescription: true, placeHolder: 'Search among unused directives' }).then(directive => {
			if (!directive) {
				return;
			}

			vsc.workspace.openTextDocument(directive.path).then(doc => {
				vsc.window.showTextDocument(doc).then(editor => {
					const { line, character } = directive.pos;
					editor.selection = new vsc.Selection(line, character, line, character);
				});
			}, (err) => {
				logError(err);
			});
		});
	}
}
