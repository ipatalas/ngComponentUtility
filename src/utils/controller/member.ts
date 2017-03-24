import * as vsc from 'vscode';
import * as ts from 'typescript';

export abstract class MemberBase implements IMember {
	public name: string;
	public type: MemberType;
	public returnType: string;
	public isPublic: boolean;
	public pos: ts.LineAndCharacter;

	protected fillCommonFields = (node: ts.PropertyDeclaration | ts.MethodDeclaration | ts.GetAccessorDeclaration, sourceFile: ts.SourceFile) => {
		this.pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
		this.name = (<ts.Identifier>node.name).text;
		this.isPublic = node.modifiers === undefined || node.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.PublicKeyword);
		this.setReturnType(node.type);
	}

	protected setReturnType = (type: ts.TypeNode) => {
		this.returnType = (type && type.getText()) || "void";
	}

	protected createCompletionItem = (): vsc.CompletionItem => {
		let item =  new vsc.CompletionItem(this.name);
		item.detail = MemberType[this.type];

		return item;
	}

	public abstract buildCompletionItem(): vsc.CompletionItem;
}

export interface IMember {
	name: string;
	type: MemberType;
	isPublic: boolean;
	pos: ts.LineAndCharacter;

	buildCompletionItem(): vsc.CompletionItem;
}

export enum MemberType {
	Property,
	Method
}
