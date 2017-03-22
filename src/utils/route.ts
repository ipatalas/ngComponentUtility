import * as ts from "typescript";
import { SourceFile } from './sourceFile';
import { IComponentTemplate } from "./component";

export class Route {
	public name: string;
	public template: IComponentTemplate;
	public path: string;
	public pos: ts.LineAndCharacter;

	public static parse(file: SourceFile): Promise<Route[]> {
		return new Promise<Route[]>((resolve, _reject) => {
			try {
				let results: Route[] = Route.parseWithApi(file).map(c => {
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
		let results: Route[] = [];

		visitAllChildren(file.sourceFile);

		return results;

		function visitAllChildren(node: ts.Node) {
			if (node.kind === ts.SyntaxKind.CallExpression) {
				let call = <ts.CallExpression>node;

				if (call.expression.kind === ts.SyntaxKind.PropertyAccessExpression
					&& (call.expression as ts.PropertyAccessExpression).name.text === 'state'
					&& call.arguments.length === 2) {
					let routeName = <ts.StringLiteral>call.arguments[0];
					let configObj = <ts.ObjectLiteralExpression>call.arguments[1];
					results.push(createRoute(routeName, configObj));

					let expr = call.expression as ts.PropertyAccessExpression;
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
			let route = new Route();
			route.name = routeName.text;
			route.pos = file.sourceFile.getLineAndCharacterOfPosition(routeName.pos);

			route.template = createTemplate(findProperty(configObj, 'template'));

			return route;
		}

		function findProperty(obj: ts.ObjectLiteralExpression, name: string) {
			return <ts.PropertyAssignment>obj.properties.find(v => v.name.getText(file.sourceFile) === name);
		}

		function createTemplate(node: ts.PropertyAssignment): IComponentTemplate {
			if (!node) {
				return undefined;
			}

			if (node.initializer.kind === ts.SyntaxKind.StringLiteral || node.initializer.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
				let pos = file.sourceFile.getLineAndCharacterOfPosition(node.initializer.getStart(file.sourceFile));
				let literal = <ts.LiteralExpression>node.initializer;

				return <IComponentTemplate>{ path: file.path, pos, body: literal.text };
			}
		}
	}
}
