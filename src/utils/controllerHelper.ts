import * as ts from 'typescript';
import { IComponentBase } from './component/component';
import { Controller } from './controller/controller';
import { ConfigParser } from './configParser';
import { TypescriptParser } from './typescriptParser';
import _ = require('lodash');
import { ControllerParser } from './controller/controllerParser';

export class ControllerHelper {
	constructor(private controllers: Controller[]) {
	}

	public prepareController(component: IComponentBase, config: ConfigParser, importedFromParser?: TypescriptParser): boolean {
		const controllerNode = config.get('controller');
		if (controllerNode) {
			if (ts.isStringLiteral(controllerNode)) {
				component.controllerName = controllerNode.text;
				component.controller = !_.isEmpty(this.controllers) && this.controllers.find(c => c.name === component.controllerName);
			} else if (ts.isIdentifier(controllerNode)) {
				component.controllerClassName = (controllerNode as ts.Identifier).text;

				const classDeclaration = importedFromParser && importedFromParser.getClassDefinition(controllerNode);
				if (classDeclaration) {
					const controllerParser = new ControllerParser(importedFromParser);
					const controller = controllerParser.parseControllerClass(classDeclaration);

					component.controller = controller;
				} else {
					component.controller = !_.isEmpty(this.controllers) && this.controllers.find(c => c.className === component.controllerClassName);
				}

			}
		}

		component.controllerAs = this.createControllerAlias(config.get('controllerAs'));

		return component.controller != null;
	}

	private createControllerAlias(node: ts.Expression): string {
		if (!node) {
			return '$ctrl';
		}

		const value = node as ts.StringLiteral;
		return value.text;
	}
}
