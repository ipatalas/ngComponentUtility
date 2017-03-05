import * as ts from "typescript";
import { SourceFile } from '../sourceFile';
import { IMember } from './member';
import { ClassMethod } from './method';
import { ClassProperty } from './property';

const ANGULAR_MODULE = /^angular\s*\.\s*module\((['"])[^'"]*\1\)$/i;

export class Controller {
	public name: string;
	public className: string;
	public path: string;
	public pos: ts.LineAndCharacter;
	public members: IMember[];

	public static parse(file: SourceFile): Promise<Controller[]> {
		return new Promise<Controller[]>((resolve, _reject) => {
			try {
				let results: Controller[] = Controller.parseWithApi(file.sourceFile).map(c => {
					c.path = file.path;
					return c;
				});

				resolve(results);
			} catch (e) {
				// tslint:disable-next-line:no-console
				console.log(`
There was an error analyzing ${file.sourceFile.fileName}.
Please report this as a bug and include failing controller if possible (remove or change sensitive data).`.trim());
				resolve([]);
			}
		});
	}

	private static parseWithApi(sourceFile: ts.SourceFile) {
		let results: Controller[] = [];

		visitAllChildren(sourceFile);

		return results;

		function visitAllChildren(node: ts.Node) {
			if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
				let functionDeclaration = <ts.FunctionDeclaration>node;

				let controller = new Controller();
				controller.name = controller.className = functionDeclaration.name.text;
				controller.pos = sourceFile.getLineAndCharacterOfPosition(functionDeclaration.name.pos);

				results.push(controller);
			} else if (node.kind === ts.SyntaxKind.ClassDeclaration) {
				let classDeclaration = <ts.ClassDeclaration>node;

				let controller = new Controller();
				controller.name = controller.className = classDeclaration.name.text;
				controller.pos = sourceFile.getLineAndCharacterOfPosition(classDeclaration.members.pos);
				controller.members = classDeclaration.members.map(createMember).filter(item => item); // filter out undefined (not implemented member types)

				results.push(controller);
			} else if (node.kind === ts.SyntaxKind.CallExpression) {
				const call = <ts.CallExpression>node;

				if (call.expression.kind === ts.SyntaxKind.PropertyAccessExpression) {
					const module = (<ts.PropertyAccessExpression>call.expression).expression.getText();

					if (ANGULAR_MODULE.test(module) && (call.expression as ts.PropertyAccessExpression).name.text === 'controller' && call.arguments.length === 2) {
						let controllerName = <ts.StringLiteral>call.arguments[0];
						let controllerIdentifier = <ts.Identifier>call.arguments[1];

						if (controllerName.text !== controllerIdentifier.text) {
							let ctrl = results.find(c => c.className === controllerIdentifier.text);
							if (ctrl) {
								ctrl.name = controllerName.text;
							}
						}
					}
				} else {
					node.getChildren().forEach(visitAllChildren);
				}
			} else {
				node.getChildren().forEach(visitAllChildren);
			}
		}

		function createMember(member: ts.ClassElement) {
			if (member.kind === ts.SyntaxKind.MethodDeclaration) {
				return ClassMethod.fromNode(<ts.MethodDeclaration>member);
			} else if (member.kind === ts.SyntaxKind.GetAccessor) {
				return ClassProperty.fromProperty(<ts.GetAccessorDeclaration>member);
			} else if (member.kind === ts.SyntaxKind.PropertyDeclaration) {
				let prop = <ts.PropertyDeclaration>member;

				if (prop.initializer && prop.initializer.kind === ts.SyntaxKind.ArrowFunction) {
					return ClassMethod.fromNode(prop);
				} else {
					return ClassProperty.fromProperty(prop);
				}
			}
		}
	}
}
