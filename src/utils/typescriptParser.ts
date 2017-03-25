import * as ts from 'typescript';

export class TypescriptParser {
	private identifierNodes: Map<string, ts.Node[]> = new Map<string, ts.Node[]>();

	constructor(private sourceFile: ts.SourceFile) {

	}

	public addIdentifier = (node: ts.Identifier) => {
		if (!this.identifierNodes.has(node.text)) {
			this.identifierNodes.set(node.text, []);
		}

		this.identifierNodes.get(node.text).push(node);
	}

	public getStringValueFromNode = (node: ts.Expression) => {
		if (node.kind === ts.SyntaxKind.StringLiteral || node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
			return (<ts.LiteralExpression>node).text;
		} else if (node.kind === ts.SyntaxKind.Identifier) {
			return this.getStringVariableValue(<ts.Identifier>node);
		} else if (node.kind === ts.SyntaxKind.PropertyAccessExpression) {
			let member = this.getPropertyAccessMember(<ts.PropertyAccessExpression>node);
			if (member) {
				return this.getStringValueFromNode(member.initializer);
			}
		}
	}

	public getObjectLiteralValueFromNode = (node: ts.Expression) => {
		if (node.kind === ts.SyntaxKind.ObjectLiteralExpression) {
			return <ts.ObjectLiteralExpression>node;
		} else if (node.kind === ts.SyntaxKind.Identifier) {
			return this.getObjectLiteralVariableValue(<ts.Identifier>node);
		} else if (node.kind === ts.SyntaxKind.PropertyAccessExpression) {
			let member = this.getPropertyAccessMember(<ts.PropertyAccessExpression>node);
			if (member) {
				return this.getObjectLiteralValueFromNode(member.initializer);
			}
		}
	}

	private getVariableDefinition = (identifier: ts.Identifier) => {
		if (this.identifierNodes.has(identifier.text)) {
			let usages = this.identifierNodes.get(identifier.text);
			let varDeclaration = usages.find(u => u.parent.kind === ts.SyntaxKind.VariableDeclaration);
			if (varDeclaration) {
				return <ts.VariableDeclaration>varDeclaration.parent;
			}
		}
	}

	private getPropertyAccessMember = (pae: ts.PropertyAccessExpression) => {
		if (pae.expression.kind === ts.SyntaxKind.Identifier) {
			let className = (<ts.Identifier>pae.expression).text;

			if (this.identifierNodes.has(className)) {
				let usages = this.identifierNodes.get(className);
				let classIdentifier = usages.find(u => u.parent.kind === ts.SyntaxKind.ClassDeclaration);
				if (classIdentifier) {
					let classDeclaration = <ts.ClassDeclaration>classIdentifier.parent;

					return <ts.PropertyDeclaration>classDeclaration.members
						.filter(m => m.kind === ts.SyntaxKind.PropertyDeclaration)
						.find(m => m.name.getText(this.sourceFile) === pae.name.text);
				}
			}
		}
	}

	private getStringVariableValue = (identifier: ts.Identifier) => {
		let varDeclaration = this.getVariableDefinition(identifier);

		if (varDeclaration && varDeclaration.initializer.kind === ts.SyntaxKind.StringLiteral) {
			return (<ts.StringLiteral>varDeclaration.initializer).text;
		}
	}

	private getObjectLiteralVariableValue = (identifier: ts.Identifier) => {
		let varDeclaration = this.getVariableDefinition(identifier);

		if (varDeclaration && varDeclaration.initializer.kind === ts.SyntaxKind.ObjectLiteralExpression) {
			return <ts.ObjectLiteralExpression>varDeclaration.initializer;
		}
	}

	public translateObjectLiteral = (node: ts.ObjectLiteralExpression) => {
		return <IObjectLiteral>node.properties.reduce((acc, current) => {
			acc[current.name.getText(this.sourceFile)] = <ts.PropertyAssignment>current;
			return acc;
		}, {});
	}
}

interface IObjectLiteral {
	[name: string]: ts.PropertyAssignment;
}
