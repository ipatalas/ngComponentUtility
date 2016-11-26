import * as ts from "typescript";
import * as path from "path";
import * as decamelize from 'decamelize';
import { SourceFile } from './sourceFile';
import { Controller } from './controller';
import { workspaceRoot } from './vsc';

export interface IComponentBinding {
	name: string;
	htmlName: string;
	type: string;
	pos: ts.LineAndCharacter;
}

export class Component {
	public name: string;
	public htmlName: string;
	public bindings: IComponentBinding[] = [];
	public path: string;
	public pos: ts.LineAndCharacter;
	public template: ComponentTemplate;
	public controller: Controller;

	public static parse(file: SourceFile, controllers: Controller[]): Promise<Component[]> {
		return new Promise<Component[]>((resolve, _reject) => {
			try {
				let results: Component[] = Component.parseWithApi(file.sourceFile, controllers).map(c => {
					c.path = file.path;
					c.htmlName = decamelize(c.name, '-');
					return c;
				});

				resolve(results);
			} catch (e) {
				// tslint:disable-next-line:no-console
				console.log(`
There was an error analyzing ${file.sourceFile.fileName}.
Please report this as a bug and include failing component if possible (remove or change sensitive data).`.trim());
				resolve([]);
			}
		});
	}

	private static parseWithApi(sourceFile: ts.SourceFile, controllers: Controller[]) {
		let results: Component[] = [];

		visitAllChildren(sourceFile);

		return results;

		function visitAllChildren(node: ts.Node) {
			if (node.kind === ts.SyntaxKind.CallExpression) {
				let call = <ts.CallExpression>node;

				if ((call.expression as ts.PropertyAccessExpression).name.text === 'component' && call.arguments.length === 2) {
					let componentName = <ts.StringLiteral>call.arguments[0];
					let componentConfigObj = <ts.ObjectLiteralExpression>call.arguments[1];

					let component = new Component();
					component.name = componentName.text;
					component.pos = sourceFile.getLineAndCharacterOfPosition(componentName.pos);

					let bindingsObj = <ts.PropertyAssignment>componentConfigObj.properties.find(v => v.name.getText() === 'bindings');
					if (bindingsObj) {
						let bindingsProps = <ts.ObjectLiteralExpression>bindingsObj.initializer;
						component.bindings.push(...bindingsProps.properties.map(createBinding));
					}

					let templateUrlObj = <ts.PropertyAssignment>componentConfigObj.properties.find(v => v.name.getText() === 'templateUrl');
					if (templateUrlObj) {
						component.template = createTemplate(templateUrlObj);
					}

					if (controllers) { // TODO: && config flag for controller
						let ctrlObj = <ts.PropertyAssignment>componentConfigObj.properties.find(v => v.name.getText() === 'controller');
						if (ctrlObj) {
							component.controller = createController(ctrlObj);
							if (!component.controller) {
								console.log(`Didn't find controller for ${component.name}`);
							}
						}
					}

					results.push(component);
				}
			} else {
				node.getChildren().forEach(c => visitAllChildren(c));
			}
		}

		function createController(node: ts.PropertyAssignment): Controller {
			if (node.initializer.kind === ts.SyntaxKind.StringLiteral) {
				return controllers.find(c => c.name === (<ts.StringLiteral>node.initializer).text);
			} else if (node.initializer.kind === ts.SyntaxKind.Identifier) {
				return controllers.find(c => c.className === (<ts.Identifier>node.initializer).text);
			}
		}

		function createTemplate(node: ts.PropertyAssignment) {
			let value = <ts.StringLiteral>node.initializer;
			let templatePath = path.join(workspaceRoot, value.text);

			return new ComponentTemplate(templatePath, { line: 0, character: 0 });
		}

		function createBinding(node: ts.PropertyAssignment): IComponentBinding {
			let binding = <IComponentBinding>{};
			binding.name = node.name.getText();
			binding.type = (<ts.StringLiteral>node.initializer).text;
			binding.htmlName = decamelize(binding.name, '-');
			binding.pos = sourceFile.getLineAndCharacterOfPosition(node.initializer.pos);

			return binding;
		}
	}
}

// TODO: unify class and interface approach for template and bindings
export class ComponentTemplate {
	constructor(public path: string, public pos: ts.LineAndCharacter) {
	}
}
