import * as ts from 'typescript';
import { ExpressionStatement, BinaryExpression, PropertyAccessExpression } from 'typescript';

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
							.forEach(m => {
								const expression = ((m as ts.ExpressionStatement).expression as BinaryExpression);
								acc[(expression.left as PropertyAccessExpression).name.getText()] = expression.right;
							})
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

	private isClass(config: ts.ObjectLiteralExpression | ts.ClassDeclaration): config is ts.ClassDeclaration {
		return (config as ts.ClassDeclaration).members !== undefined;
	}
}
