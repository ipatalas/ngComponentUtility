import { TypescriptParser } from '../typescriptParser';
import { Route } from './route';
import { SourceFile } from '../sourceFile';
import * as ts from 'typescript';
import { ConfigParser } from '../configParser';
import { IComponentTemplate } from '../component/component';

export class RouteParser {
	private tsParser: TypescriptParser;
	private results: Route[] = [];

	constructor(file: SourceFile) {
		this.tsParser = new TypescriptParser(file);
	}

	public parse() {
		this.parseChildren(this.tsParser.sourceFile);

		return this.results;
	}

	private parseChildren = (node: ts.Node) => {
		if (node.kind === ts.SyntaxKind.CallExpression) {
			const call = node as ts.CallExpression;

			if (call.expression.kind === ts.SyntaxKind.PropertyAccessExpression
				&& (call.expression as ts.PropertyAccessExpression).name.text === 'state'
				&& call.arguments.length === 2) {
				const routeName = call.arguments[0] as ts.StringLiteral;
				const configObj = call.arguments[1] as ts.Expression;
				this.results.push(this.createRoute(routeName, configObj));

				const expr = call.expression as ts.PropertyAccessExpression;
				if (expr.expression.kind === ts.SyntaxKind.CallExpression) {
					this.parseChildren(expr.expression);
				}
			} else {
				call.getChildren().forEach(this.parseChildren);
			}
		} else {
			node.getChildren().forEach(this.parseChildren);
		}
	}

	private createRoute = (routeName: ts.StringLiteral, configNode: ts.Expression) => {
		const configObj = this.tsParser.getObjectLiteralValueFromNode(configNode);
		const config = new ConfigParser(configObj);

		const route = new Route();
		route.name = routeName.text;
		route.pos = this.tsParser.sourceFile.getLineAndCharacterOfPosition(routeName.pos);
		route.path = this.tsParser.path;

		route.template = this.createTemplate(config.get('template'));

		return route;
	}

	private createTemplate = (initializer: ts.Expression): IComponentTemplate => {
		if (!initializer) {
			return undefined;
		}

		if (initializer.kind === ts.SyntaxKind.StringLiteral || initializer.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
			const pos = this.tsParser.sourceFile.getLineAndCharacterOfPosition(initializer.getStart(this.tsParser.sourceFile));
			const literal = initializer as ts.LiteralExpression;

			return { path: this.tsParser.sourceFile.fullpath, pos, body: literal.text } as IComponentTemplate;
		}
	}
}
