import * as ts from 'typescript';
import { IComponentWithController } from './component/component';
import { Controller } from './controller/controller';
import { ConfigParser } from './configParser';

export class ControllerHelper {
	constructor(private controllers: Controller[]) {
	}

	public prepareController(component: IComponentWithController, config: ConfigParser): boolean {
		if (!this.controllers || this.controllers.length === 0) {
			return false;
		}

		const controllerNode = config.get('controller');
		if (controllerNode) {
			if (controllerNode.kind === ts.SyntaxKind.StringLiteral) {
				component.controllerName = (controllerNode as ts.StringLiteral).text;
				component.controller = this.controllers.find(c => c.name === component.controllerName);
			} else if (controllerNode.kind === ts.SyntaxKind.Identifier) {
				component.controllerClassName = (controllerNode as ts.Identifier).text;
				component.controller = this.controllers.find(c => c.className === component.controllerClassName);
			}

			if (component.controller) {
				component.controllerAs = this.createControllerAlias(config.get('controllerAs'));
			}
		}

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
