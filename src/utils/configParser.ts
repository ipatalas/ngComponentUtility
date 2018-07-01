import * as ts from 'typescript';

export class ConfigParser {
	private properties: {[index: string]: ts.Expression};

	constructor(config: ts.ObjectLiteralExpression | ts.ClassDeclaration) {
		if (this.isClass(config)) {
			this.properties = config.members
				.filter(m => [ts.SyntaxKind.PropertyDeclaration, ts.SyntaxKind.Constructor].indexOf(m.kind) !== -1)
				.reduce((acc, member: ts.PropertyDeclaration | ts.ConstructorDeclaration) => {
					if (ts.isPropertyDeclaration(member)) {
						acc[(member.name as ts.Identifier).text] = member.initializer;
					} else if (ts.isConstructorDeclaration(member)) {
						member.body.statements
							.filter(m => m.kind === ts.SyntaxKind.ExpressionStatement)
							.forEach((m: ts.ExpressionStatement) => {
								if (ts.isBinaryExpression(m.expression) && ts.isPropertyAccessExpression(m.expression.left)) {
									acc[m.expression.left.name.getText()] = m.expression.right;
								}
							});
					}
					return acc;
				}, {});
		} else if (config.properties) {
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
