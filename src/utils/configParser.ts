import * as ts from 'typescript';

export class ConfigParser {
	private properties: {[index: string]: ts.Expression};

	constructor(config: ts.ObjectLiteralExpression | ts.ClassDeclaration) {
		if (this.isClass(config)) {
			this.properties = config.members
				.filter(m => m.kind === ts.SyntaxKind.PropertyDeclaration)
				.reduce((acc, member: ts.PropertyDeclaration) => {
					acc[(member.name as ts.Identifier).text] = member.initializer;
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
