import * as ts from 'typescript';
import * as vsc from 'vscode';
import { MemberType, MemberBase } from './member';

export class ClassProperty extends MemberBase {
	public name: string;
	public readonly type: MemberType = MemberType.Property;

	private constructor() {
		super();
	}
	public static fromProperty(node: ts.PropertyDeclaration | ts.GetAccessorDeclaration, sourceFile: ts.SourceFile) {
		const result = new ClassProperty();
		result.fillCommonFields(node, sourceFile);

		return result;
	}

	public buildCompletionItem() {
		const item = this.createCompletionItem();
		item.kind = vsc.CompletionItemKind.Field;
		item.documentation = 'Type: ' + this.returnType || 'any';

		return item;
	}
}
