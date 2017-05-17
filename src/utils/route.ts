import * as ts from "typescript";
import { SourceFile } from './sourceFile';
import { IComponentTemplate } from "./component/component";

export class Route {
	public name: string;
	public template: IComponentTemplate;
	public path: string;
	public pos: ts.LineAndCharacter;

	public static parse(file: SourceFile): Promise<Route[]> {
		return new Promise<Route[]>((resolve, _reject) => {
			try {
				const results: Route[] = Route.parseWithApi(file).map(c => {
					c.path = file.path;
					return c;
				});

				resolve(results);
			} catch (e) {
				// tslint:disable-next-line:no-console
				console.log(`
There was an error analyzing ${file.sourceFile.fileName}.
Please report this as a bug and include failing component if possible (remove or change sensitive data).

${e}`.trim());
				resolve([]);
			}
		});
	}

	private static parseWithApi(file: SourceFile) {
		const results: Route[] = [];

		visitAllChildren(file.sourceFile);

		return results;

		function visitAllChildren(node: ts.Node) {
			if (node.kind === ts.SyntaxKind.CallExpression) {
				const call = node as ts.CallExpression;

				if (call.expression.kind === ts.SyntaxKind.PropertyAccessExpression
					&& (call.expression as ts.PropertyAccessExpression).name.text === 'state'
					&& call.arguments.length === 2) {
					const routeName = call.arguments[0] as ts.StringLiteral;
					const configObj = call.arguments[1] as ts.ObjectLiteralExpression;
					results.push(createRoute(routeName, configObj));

					const expr = call.expression as ts.PropertyAccessExpression;
					if (expr.expression.kind === ts.SyntaxKind.CallExpression) {
						visitAllChildren(expr.expression);
					}
				} else {
					call.getChildren().forEach(visitAllChildren);
				}
			} else {
				node.getChildren().forEach(visitAllChildren);
			}
		}

		function createRoute(routeName: ts.StringLiteral, configObj: ts.ObjectLiteralExpression) {
			const route = new Route();
			route.name = routeName.text;
			route.pos = file.sourceFile.getLineAndCharacterOfPosition(routeName.pos);

			route.template = createTemplate(findProperty(configObj, 'template'));

			return route;
		}

		function findProperty(obj: ts.ObjectLiteralExpression, name: string) {
			return obj.properties.find(v => v.name.getText(file.sourceFile) === name) as ts.PropertyAssignment;
		}

		function createTemplate(node: ts.PropertyAssignment): IComponentTemplate {
			if (!node) {
				return undefined;
			}

			if (node.initializer.kind === ts.SyntaxKind.StringLiteral || node.initializer.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
				const pos = file.sourceFile.getLineAndCharacterOfPosition(node.initializer.getStart(file.sourceFile));
				const literal = node.initializer as ts.LiteralExpression;

				return { path: file.sourceFile.fullpath, pos, body: literal.text } as IComponentTemplate;
			}
		}
	}
}
