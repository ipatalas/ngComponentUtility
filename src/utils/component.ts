import * as ts from "typescript";
import * as path from "path";
import * as decamelize from 'decamelize';
import { SourceFile } from './sourceFile';
import { Controller } from './controller/controller';
import { workspaceRoot } from './vsc';

export class Component {
	public name: string;
	public htmlName: string;
	public bindings: IComponentBinding[] = [];
	public path: string;
	public pos: ts.LineAndCharacter;
	public template: IComponentTemplate;
	public controller: Controller;
	public controllerAs: string;

	public static parse(file: SourceFile, controllers: Controller[]): Promise<Component[]> {
		return new Promise<Component[]>((resolve, _reject) => {
			try {
				let results: Component[] = Component.parseWithApi(file, controllers).map(c => {
					c.path = file.path;
					c.htmlName = decamelize(c.name, '-');
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

	private static parseWithApi(file: SourceFile, controllers: Controller[]) {
		let results: Component[] = [];

		visitAllChildren(file.sourceFile);

		return results;

		function visitAllChildren(node: ts.Node) {
			if (node.kind === ts.SyntaxKind.CallExpression) {
				let call = <ts.CallExpression>node;

				if (call.expression.kind === ts.SyntaxKind.PropertyAccessExpression
					&& (call.expression as ts.PropertyAccessExpression).name.text === 'component'
					&& call.arguments.length === 2) {
					let componentName = <ts.StringLiteral>call.arguments[0];
					let componentConfigObj = <ts.ObjectLiteralExpression>call.arguments[1];

					results.push(createComponent(componentName, componentConfigObj));
				} else {
					call.getChildren().forEach(visitAllChildren);
				}
			} else {
				node.getChildren().forEach(visitAllChildren);
			}
		}

		function createComponent(componentName: ts.StringLiteral, configObj: ts.ObjectLiteralExpression) {
			let component = new Component();
			component.name = componentName.text;
			component.pos = file.sourceFile.getLineAndCharacterOfPosition(componentName.pos);

			let bindingsObj = findProperty(configObj, 'bindings');
			if (bindingsObj) {
				let bindingsProps = <ts.ObjectLiteralExpression>bindingsObj.initializer;
				component.bindings.push(...bindingsProps.properties.map(createBinding));
			}

			component.template = createTemplateFromUrl(findProperty(configObj, 'templateUrl'));
			if (!component.template) {
				component.template = createTemplate(findProperty(configObj, 'template'));
			}

			component.controllerAs = createControllerAlias(findProperty(configObj, 'controllerAs'));

			if (controllers && controllers.length > 0) {
				component.controller = createController(findProperty(configObj, 'controller'));
				if (!component.controller) {
					// tslint:disable-next-line:no-console
					console.log(`Controller for ${component.name} is not defined`);
				}
			}

			return component;
		}

		function findProperty(obj: ts.ObjectLiteralExpression, name: string) {
			return <ts.PropertyAssignment>obj.properties.find(v => v.name.getText(file.sourceFile) === name);
		}

		function createController(node: ts.PropertyAssignment): Controller {
			if (!node) {
				return undefined;
			}

			if (node.initializer.kind === ts.SyntaxKind.StringLiteral) {
				return controllers.find(c => c.name === (<ts.StringLiteral>node.initializer).text);
			} else if (node.initializer.kind === ts.SyntaxKind.Identifier) {
				return controllers.find(c => c.className === (<ts.Identifier>node.initializer).text);
			}
		}

		function createTemplate(node: ts.PropertyAssignment): IComponentTemplate {
			if (!node) {
				return undefined;
			}

			if (node.initializer.kind === ts.SyntaxKind.StringLiteral || node.initializer.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
				let pos = file.sourceFile.getLineAndCharacterOfPosition(node.initializer.getStart(file.sourceFile));
				let literal = <ts.LiteralExpression>node.initializer;

				return <IComponentTemplate>{ path: file.path, pos, body: literal.text };
			} else if (node.initializer.kind === ts.SyntaxKind.CallExpression) {
				// handle require('./template.html')
				const call = <ts.CallExpression>node.initializer;
				if (call.arguments.length === 1 && call.expression.kind === ts.SyntaxKind.Identifier && call.expression.getText() === "require") {
					const relativePath = (<ts.StringLiteral>call.arguments[0]).text;
					const templatePath = path.join(path.dirname(file.path), relativePath);

					return <IComponentTemplate>{ path: templatePath, pos: { line: 0, character: 0 } };
				}
			}
		}

		function createTemplateFromUrl(node: ts.PropertyAssignment) {
			if (!node) {
				return undefined;
			}

			let value = <ts.StringLiteral>node.initializer;
			let templatePath = path.join(workspaceRoot, value.text);

			return <IComponentTemplate>{ path: templatePath, pos: { line: 0, character: 0 } };
		}

		function createBinding(node: ts.PropertyAssignment): IComponentBinding {
			let binding = <IComponentBinding>{};
			binding.name = node.name.getText(file.sourceFile);
			binding.type = (<ts.StringLiteral>node.initializer).text;
			binding.htmlName = decamelize(binding.name, '-');
			binding.pos = file.sourceFile.getLineAndCharacterOfPosition(node.initializer.pos);

			return binding;
		}

		function createControllerAlias(node: ts.PropertyAssignment): string {
			if (!node) {
				return '$ctrl';
			}

			let value = <ts.StringLiteral>node.initializer;
			return value.text;
		}
	}
}

export interface IComponentTemplate {
	path: string;
	pos: ts.LineAndCharacter;
	body?: string; // used only for inline templates
}

export interface IComponentBinding {
	name: string;
	htmlName: string;
	type: string;
	pos: ts.LineAndCharacter;
}

