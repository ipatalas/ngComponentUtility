
import { IHtmlReferences } from '../utils/htmlTemplate/types';
import { Component } from '../utils/component/component';
import * as vsc from 'vscode';

export class FindUnusedComponentsCommand {
	public execute = (htmlReferences: IHtmlReferences, components: Component[]) => {
		const usedComponents = Object.keys(htmlReferences);
		const unusedComponents = components.filter(c => usedComponents.indexOf(c.htmlName) === -1);

		if (unusedComponents.length === 0) {
			vsc.window.showInformationMessage('All of your components are used. Good for you :-)');
			return;
		}

		const items = unusedComponents.map(c => ({ ...c, label: c.name, description: c.htmlName }));

		vsc.window.showQuickPick(items, {matchOnDescription: true, placeHolder: 'Search among unused components'}).then(component => {
			if (!component) {
				return;
			}

			vsc.workspace.openTextDocument(component.path).then(doc => {
				vsc.window.showTextDocument(doc).then(editor => {
					const { line, character } = component.pos;
					editor.selection = new vsc.Selection(line, character, line, character);
				});
			}, (err) => {
				// tslint:disable-next-line:no-console
				console.error(err);
			});
		});
	}
}
