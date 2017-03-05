import * as ts from "typescript";
import * as vsc from 'vscode';
import { MemberType, MemberBase } from './member';

export class ClassProperty extends MemberBase {
	public name: string;
	public readonly type: MemberType = MemberType.Property;

	private constructor() {
		super();
	}
	public static fromProperty(node: ts.PropertyDeclaration | ts.GetAccessorDeclaration) {
		let result = new ClassProperty();
		result.fillCommonFields(node);

		return result;
	}

	public buildCompletionItem() {
		let item = this.createCompletionItem();
		item.kind = vsc.CompletionItemKind.Field;
		item.documentation = "Type: " + this.returnType || "any";

		return item;
	}
}
