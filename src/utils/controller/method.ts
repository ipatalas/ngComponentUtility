import * as ts from "typescript";
import * as vsc from 'vscode';
import { MemberType, MemberBase } from './member';

export class ClassMethod extends MemberBase {
	public name: string;
	public readonly type = MemberType.Method;
	public parameters: IParameter[] = [];

	private constructor() {
		super();
	}

	public static fromNode(node: ts.PropertyDeclaration | ts.MethodDeclaration) {
		let result = new ClassMethod();
		result.fillCommonFields(node);

		if (isProperty(node)) {
			let initializer = <ts.ArrowFunction>node.initializer;
			result.setReturnType(initializer.type);
			result.parameters = initializer.parameters.map(this.createParameter);
		} else {
			result.parameters = node.parameters.map(this.createParameter);
		}

		return result;
	}

	private static createParameter = (p: ts.ParameterDeclaration): IParameter => {
		return {
			name: p.name.getText(),
			type: p.type.getText()
		};
	}

	public buildCompletionItem() {
		let item = this.createCompletionItem();
		item.kind = vsc.CompletionItemKind.Function;
		item.documentation = `${this.name}(${this.parameters.map(p => p.name + ": " + p.type).join(", ")}): ${this.returnType}`;

		return item;
	}
}

function isProperty(node: ts.PropertyDeclaration | ts.MethodDeclaration): node is ts.PropertyDeclaration {
	return (<ts.PropertyDeclaration>node).initializer !== undefined;
}

interface IParameter {
	name: string;
	type: string;
}
