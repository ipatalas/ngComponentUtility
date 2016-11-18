import * as ts from "typescript";
import * as decamelize from 'decamelize';
import { SourceFile } from './sourceFile';

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

	public static parse(file: SourceFile): Promise<Component[]> {
		return new Promise<Component[]>((resolve, _reject) => {
			try {
				let results: Component[] = Component.parseWithApi(file.sourceFile).map(c => {
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

	private static parseWithApi(sourceFile: ts.SourceFile) {
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

					results.push(component);
				}
			} else {
				node.getChildren().forEach(c => visitAllChildren(c));
			}
		}

		function createBinding(node: ts.PropertyAssignment): IComponentBinding {
			let binding = <IComponentBinding>{};
			binding.name = node.name.getText();
			binding.type = (<ts.StringLiteral>node.initializer).text;
			binding.htmlName = decamelize(binding.name, '-');
			binding.pos = sourceFile.getLineAndCharacterOfPosition(node.pos);

			return binding;
		}
	}
}
