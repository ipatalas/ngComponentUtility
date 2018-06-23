import * as ts from 'typescript';
import { isTsKind } from './typescriptParser';

export class ConfigParser {
	private properties: {[index: string]: ts.Expression};

	constructor(config: ts.ObjectLiteralExpression | ts.ClassDeclaration) {
		if (this.isClass(config)) {
			this.properties = config.members
				.filter(m => [ts.SyntaxKind.PropertyDeclaration, ts.SyntaxKind.Constructor].indexOf(m.kind) !== -1)
				.reduce((acc, member: ts.PropertyDeclaration | ts.ConstructorDeclaration) => {
					if (member.kind === ts.SyntaxKind.PropertyDeclaration) {
						acc[(member.name as ts.Identifier).text] = member.initializer;
					} else if (member.kind === ts.SyntaxKind.Constructor) {
						member.body.statements
							.filter(m => m.kind === ts.SyntaxKind.ExpressionStatement)
							.forEach((m: ts.ExpressionStatement) => {
								if (isTsKind<ts.BinaryExpression>(m.expression, ts.SyntaxKind.BinaryExpression) &&
									isTsKind<ts.PropertyAccessExpression>(m.expression.left, ts.SyntaxKind.PropertyAccessExpression)) {
									acc[m.expression.left.name.getText()] = m.expression.right;
								}
							});
					}
					return acc;
				}, {});
		} else {
			this.properties = config.properties
				.reduce((acc, member: ts.PropertyAssignment) => {
					acc[(member.name as ts.Identifier).text] = member.initializer;
					return acc;
				}, {});
		}
	}

	public get = (name: string) => this.properties[name];

	public entries = () => Object.entries(this.properties);

	private isClass(config: ts.ObjectLiteralExpression | ts.ClassDeclaration): config is ts.ClassDeclaration {
		return (config as ts.ClassDeclaration).members !== undefined;
	}
}
