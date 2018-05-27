import * as ts from 'typescript';
import { SourceFile } from '../sourceFile';
import { Controller } from './controller';
import { ClassMethod } from './method';
import { ClassProperty } from './property';
import _ = require('lodash');
import { isTsKind } from '../typescriptParser';

export class ControllerParser {
	private results: Controller[] = [];

	constructor(private file: SourceFile) {
	}

	public parse = () => {
		this.parseChildren(this.file.sourceFile);

		return this.results;
	}

	private parseChildren = (node: ts.Node) => {
		if (node.kind === ts.SyntaxKind.FunctionDeclaration) {
			const functionDeclaration = node as ts.FunctionDeclaration;

			const controller = new Controller();
			controller.path = this.file.path;
			controller.name = controller.className = functionDeclaration.name.text;
			controller.pos = this.file.sourceFile.getLineAndCharacterOfPosition(functionDeclaration.name.pos);

			this.results.push(controller);
		} else if (this.isControllerClass(node)) {
			const controller = this.parseControllerClass(node);

			this.results.push(controller);
		} else if (node.kind === ts.SyntaxKind.CallExpression) {
			const call = node as ts.CallExpression;

			if (this.isAngularModule(call.expression)) {
				const controllerCall = this.findControllerRegistration(call.parent);
				if (controllerCall) {
					const controllerName = controllerCall.arguments[0] as ts.StringLiteral;
					const controllerIdentifier = controllerCall.arguments[1] as ts.Identifier;

					if (controllerName.text !== controllerIdentifier.text) {
						const ctrl = this.results.find(c => c.className === controllerIdentifier.text);
						if (ctrl) {
							ctrl.name = controllerName.text;
						}
					}
				}
			} else {
				node.getChildren().forEach(this.parseChildren);
			}
		} else {
			node.getChildren().forEach(this.parseChildren);
		}
	}

	public parseControllerClass(node: ts.ClassDeclaration) {
		const controller = new Controller();
		controller.path = this.file.path;
		controller.name = controller.className = node.name.text;
		controller.pos = this.file.sourceFile.getLineAndCharacterOfPosition(node.members.pos);
		controller.baseClassName = this.getBaseClassName(node);
		controller.members = [
			...node.members.map(m => this.createMember(controller, m)).filter(item => item),
			...this.getConstructorMembers(controller, node.members)
		];

		return controller;
	}

	private findControllerRegistration = (node: ts.Node): ts.CallExpression => {
		if (node.kind === ts.SyntaxKind.PropertyAccessExpression) {
			const pae = node as ts.PropertyAccessExpression;
			if (pae.name.text === 'controller' && pae.parent && pae.parent.kind === ts.SyntaxKind.CallExpression) {
				const call = pae.parent as ts.CallExpression;
				if (call.arguments.length === 2) {
					return call;
				}
			}
		}

		if (node.parent) {
			return this.findControllerRegistration(node.parent);
		}
	}

	private isAngularModule = (expression: ts.Expression) => {
		const pae = expression as ts.PropertyAccessExpression;

		return expression.kind === ts.SyntaxKind.PropertyAccessExpression &&
			(pae.expression.kind === ts.SyntaxKind.Identifier && pae.name.kind === ts.SyntaxKind.Identifier) &&
			(pae.expression as ts.Identifier).text === 'angular' && (pae.name as ts.Identifier).text === 'module';
	}

	private createMember = (controller: Controller, member: ts.ClassElement) => {
		if (isTsKind<ts.MethodDeclaration>(member, ts.SyntaxKind.MethodDeclaration)) {
			return ClassMethod.fromNode(controller, member, this.file.sourceFile);
		} else if (isTsKind<ts.GetAccessorDeclaration>(member, ts.SyntaxKind.GetAccessor)) {
			return ClassProperty.fromProperty(controller, member, this.file.sourceFile);
		} else if (isTsKind<ts.PropertyDeclaration>(member, ts.SyntaxKind.PropertyDeclaration)) {
			if (member.initializer && member.initializer.kind === ts.SyntaxKind.ArrowFunction) {
				return ClassMethod.fromNode(controller, member, this.file.sourceFile);
			} else {
				return ClassProperty.fromProperty(controller, member, this.file.sourceFile);
			}
		}
	}

	private getConstructorMembers = (controller: Controller, members: ts.NodeArray<ts.ClassElement>): ClassProperty[] => {
		const ctor = members.find((m: ts.ClassElement): m is ts.ConstructorDeclaration => m.kind === ts.SyntaxKind.Constructor);

		if (ctor) {
			return ctor.parameters.filter(p => p.modifiers).map(p => ClassProperty.fromConstructorParameter(controller, p, this.file.sourceFile));
		}

		return [];
	}

	private getBaseClassName = (classDeclaration: ts.ClassDeclaration): string => {
		if (classDeclaration.heritageClauses) {
			const extendsClause = classDeclaration.heritageClauses.find(hc => hc.token === ts.SyntaxKind.ExtendsKeyword);

			if (extendsClause && extendsClause.types.length === 1) {
				const typeExpression = extendsClause.types[0].expression;

				if (isTsKind<ts.PropertyAccessExpression>(typeExpression, ts.SyntaxKind.PropertyAccessExpression)) {
					return typeExpression.name.text;
				}

				return typeExpression.getText();
			}
		}
	}

	private isControllerClass(node: ts.Node): node is ts.ClassDeclaration {
		return isTsKind<ts.ClassDeclaration>(node, ts.SyntaxKind.ClassDeclaration) && !this.implementsComponentOptions(node);
	}

	private implementsComponentOptions(classDeclaration: ts.ClassDeclaration) {
		if (!classDeclaration.heritageClauses) {
			return false;
		}

		const typeNames = _.flatMap(classDeclaration.heritageClauses, x => x.types.map(t => t.getText()));

		return typeNames.some(t => t.includes('IComponentOptions'));
	}
}
