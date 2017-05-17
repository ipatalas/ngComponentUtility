
import { IHtmlReferences } from "../utils/htmlReferencesCache";
import { Component } from "../utils/component/component";
import * as vsc from 'vscode';

export class FindUnusedComponentsCommand {
	private htmlReferences: IHtmlReferences;
	private components: Component[];

	public load = (htmlReferences: IHtmlReferences, components: Component[]) => {
		this.htmlReferences = htmlReferences;
		this.components = components;
	}

	public execute = () => {
		const usedComponents = Object.keys(this.htmlReferences);
		const unusedComponents = this.components.filter(c => usedComponents.indexOf(c.htmlName) === -1);

		if (unusedComponents.length === 0) {
			vsc.window.showInformationMessage("All of your components are used. Good for you :-)");
			return;
		}

		const items = unusedComponents.map(c => ({ ...c, label: c.name, description: c.htmlName }));

		vsc.window.showQuickPick(items, {matchOnDescription: true, placeHolder: "Search among unused components"}).then(component => {
			if (!component) {
				return;
			}

			vsc.workspace.openTextDocument(component.path).then(doc => {
				vsc.window.showTextDocument(doc).then(editor => {
					const { line, character } = component.pos;
					editor.selection = new vsc.Selection(line, character, line, character);
				});
			}, (err) => {
				console.error(err);
			});
		});
	}
}
