import * as ts from 'typescript';
import { ISourceFile } from "./sourceFile";

export class TypescriptParser {
	private identifierNodes: Map<string, ts.Node[]> = new Map<string, ts.Node[]>();

	get path() {
		return this.sourceFile.fullpath;
	}

	constructor(public sourceFile: ISourceFile) {

	}

	public addIdentifier = (node: ts.Identifier) => {
		if (!this.identifierNodes.has(node.text)) {
			this.identifierNodes.set(node.text, []);
		}

		this.identifierNodes.get(node.text).push(node);
	}

	public getStringValueFromNode = (node: ts.Expression) => {
		if (node.kind === ts.SyntaxKind.StringLiteral || node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
			return (node as ts.LiteralExpression).text;
		} else if (node.kind === ts.SyntaxKind.Identifier) {
			return this.getStringVariableValue(node as ts.Identifier);
		} else if (node.kind === ts.SyntaxKind.PropertyAccessExpression) {
			const member = this.getPropertyAccessMember(node as ts.PropertyAccessExpression);
			if (member) {
				return this.getStringValueFromNode(member.initializer);
			}
		}
	}

	public getObjectLiteralValueFromNode = (node: ts.Expression): ts.ObjectLiteralExpression => {
		if (node.kind === ts.SyntaxKind.ObjectLiteralExpression) {
			return node as ts.ObjectLiteralExpression;
		} else if (node.kind === ts.SyntaxKind.AsExpression) {
			return (node as ts.AsExpression).expression as ts.ObjectLiteralExpression;
		} else if (node.kind === ts.SyntaxKind.Identifier) {
			return this.getObjectLiteralVariableValue(node as ts.Identifier);
		} else if (node.kind === ts.SyntaxKind.PropertyAccessExpression) {
			const member = this.getPropertyAccessMember(node as ts.PropertyAccessExpression);
			if (member) {
				return this.getObjectLiteralValueFromNode(member.initializer);
			}
		}
	}

	public getImportDeclaration = (identifier: ts.Identifier): ts.ImportDeclaration => {
		if (this.identifierNodes.has(identifier.text)) {
			const usages = this.identifierNodes.get(identifier.text);
			const node = usages.find(u => u.parent.kind === ts.SyntaxKind.ImportSpecifier);

			return this.closestParent<ts.ImportDeclaration>(node.parent, ts.SyntaxKind.ImportDeclaration);
		}
	}

	private closestParent = <TNode extends ts.Node>(node: ts.Node, kind: ts.SyntaxKind) => {
		while (node && node.kind !== kind) {
			node = node.parent;
		}

		return node as TNode;
	}

	private getVariableDefinition = (identifier: ts.Identifier) => {
		if (this.identifierNodes.has(identifier.text)) {
			const usages = this.identifierNodes.get(identifier.text);
			const varDeclaration = usages.find(u => u.parent.kind === ts.SyntaxKind.VariableDeclaration);
			if (varDeclaration) {
				return varDeclaration.parent as ts.VariableDeclaration;
			}
		}
	}

	private getPropertyAccessMember = (pae: ts.PropertyAccessExpression) => {
		if (pae.expression.kind === ts.SyntaxKind.Identifier) {
			const className = (pae.expression as ts.Identifier).text;

			if (this.identifierNodes.has(className)) {
				const usages = this.identifierNodes.get(className);
				const classIdentifier = usages.find(u => u.parent.kind === ts.SyntaxKind.ClassDeclaration);
				if (classIdentifier) {
					const classDeclaration = classIdentifier.parent as ts.ClassDeclaration;

					return classDeclaration.members
						.filter(m => m.kind === ts.SyntaxKind.PropertyDeclaration)
						.find(m => m.name.getText(this.sourceFile) === pae.name.text) as ts.PropertyDeclaration;
				}
			}
		}
	}

	private getStringVariableValue = (identifier: ts.Identifier) => {
		const varDeclaration = this.getVariableDefinition(identifier);

		if (varDeclaration && varDeclaration.initializer.kind === ts.SyntaxKind.StringLiteral) {
			return (varDeclaration.initializer as ts.StringLiteral).text;
		}
	}

	private getObjectLiteralVariableValue = (identifier: ts.Identifier) => {
		const varDeclaration = this.getVariableDefinition(identifier);

		if (varDeclaration && varDeclaration.initializer.kind === ts.SyntaxKind.ObjectLiteralExpression) {
			return varDeclaration.initializer as ts.ObjectLiteralExpression;
		}
	}

	public getExportedVariable = (node: ts.Node, name: string): ts.VariableDeclaration =>  {
		if (node.kind === ts.SyntaxKind.Identifier && (node as ts.Identifier).text === name && node.parent.kind === ts.SyntaxKind.VariableDeclaration) {
			const varStatement = this.closestParent<ts.VariableStatement>(node.parent, ts.SyntaxKind.VariableStatement);
			if (varStatement && varStatement.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
				return node.parent as ts.VariableDeclaration;
			}
		}

		return ts.forEachChild(node, n => this.getExportedVariable(n, name));
	}

	public getExportedClass = (node: ts.Node, name: string): ts.ClassDeclaration => {
		if (node.kind === ts.SyntaxKind.Identifier && (node as ts.Identifier).text === name && node.parent.kind === ts.SyntaxKind.ClassDeclaration) {
			const classDeclaration = this.closestParent<ts.ClassDeclaration>(node.parent, ts.SyntaxKind.ClassDeclaration);
			if (classDeclaration && classDeclaration.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
				return node.parent as ts.ClassDeclaration;
			}
		}

		return ts.forEachChild(node, n => this.getExportedClass(n, name));
	}
}
