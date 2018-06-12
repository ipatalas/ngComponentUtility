import * as ts from 'typescript';
import { IComponentBinding } from './component';
import * as vsc from 'vscode';
import { TypescriptParser } from '../typescriptParser';
import _ = require('lodash');

export class ComponentBinding implements IComponentBinding {
	public name: string;
	public htmlName: string;
	public type: string;
	public pos: ts.LineAndCharacter;

	constructor(node: ts.PropertyAssignment, parser: TypescriptParser) {
		const { type, name } = this.parseType((node.initializer as ts.StringLiteral).text);

		this.name = node.name.getText(parser.sourceFile);
		this.type = type;
		this.htmlName = _.kebabCase(name || this.name);
		this.pos = parser.sourceFile.getLineAndCharacterOfPosition(node.initializer.pos);
	}

	private parseType = (type: string) => {
		const match = /^(.*?)(\w+)?$/g.exec(type);
		return {
			type: match[1],
			name: match[2]
		};
	}

	public buildCompletionItem(): vsc.CompletionItem {
		const item =  new vsc.CompletionItem(this.name);
		item.detail = `Binding: ${this.type}`;
		item.kind = vsc.CompletionItemKind.Reference;

		return item;
	}
}
