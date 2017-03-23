import * as ts from 'typescript';
import * as path from "path";
import * as decamelize from 'decamelize';
import { SourceFile } from "./sourceFile";
import { Controller } from "./controller/controller";
import { Component, IComponentTemplate, IComponentBinding } from "./component";
import { workspaceRoot } from './vsc';

export class ComponentParser {
	private results: Component[] = [];

	constructor(private file: SourceFile, private controllers: Controller[]) {

	}
	public parse = () => {
		this.parseChildren(this.file.sourceFile);

		return this.results;
	}

	private parseChildren = (node: ts.Node) => {
		if (node.kind === ts.SyntaxKind.CallExpression) {
			let call = <ts.CallExpression>node;

			if (call.expression.kind === ts.SyntaxKind.PropertyAccessExpression
				&& (call.expression as ts.PropertyAccessExpression).name.text === 'component'
				&& call.arguments.length === 2) {
				let componentName = <ts.StringLiteral>call.arguments[0];
				let componentConfigObj = <ts.ObjectLiteralExpression>call.arguments[1];

				this.results.push(this.createComponent(componentName, componentConfigObj));
			} else {
				call.getChildren().forEach(this.parseChildren);
			}
		} else {
			node.getChildren().forEach(this.parseChildren);
		}
	}

	private createComponent = (componentName: ts.StringLiteral, configObj: ts.ObjectLiteralExpression) => {
		let component = new Component();
		component.name = componentName.text;
		component.pos = this.file.sourceFile.getLineAndCharacterOfPosition(componentName.pos);

		let bindingsObj = this.findProperty(configObj, 'bindings');
		if (bindingsObj) {
			let bindingsProps = <ts.ObjectLiteralExpression>bindingsObj.initializer;
			component.bindings.push(...bindingsProps.properties.map(this.createBinding));
		}

		component.template = this.createTemplateFromUrl(this.findProperty(configObj, 'templateUrl'));
		if (!component.template) {
			component.template = this.createTemplate(this.findProperty(configObj, 'template'));
		}

		component.controllerAs = this.createControllerAlias(this.findProperty(configObj, 'controllerAs'));

		if (this.controllers && this.controllers.length > 0) {
			component.controller = this.createController(this.findProperty(configObj, 'controller'));
			if (!component.controller) {
				// tslint:disable-next-line:no-console
				console.log(`Controller for ${component.name} is not defined`);
			}
		}

		return component;
	}

	private findProperty = (obj: ts.ObjectLiteralExpression, name: string) => {
		return <ts.PropertyAssignment>obj.properties.find(v => v.name.getText(this.file.sourceFile) === name);
	}

	private createController = (node: ts.PropertyAssignment): Controller => {
		if (!node) {
			return undefined;
		}

		if (node.initializer.kind === ts.SyntaxKind.StringLiteral) {
			return this.controllers.find(c => c.name === (<ts.StringLiteral>node.initializer).text);
		} else if (node.initializer.kind === ts.SyntaxKind.Identifier) {
			return this.controllers.find(c => c.className === (<ts.Identifier>node.initializer).text);
		}
	}

	private createTemplate = (node: ts.PropertyAssignment): IComponentTemplate => {
		if (!node) {
			return undefined;
		}

		if (node.initializer.kind === ts.SyntaxKind.StringLiteral || node.initializer.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
			let pos = this.file.sourceFile.getLineAndCharacterOfPosition(node.initializer.getStart(this.file.sourceFile));
			let literal = <ts.LiteralExpression>node.initializer;

			return <IComponentTemplate>{ path: this.file.path, pos, body: literal.text };
		} else if (node.initializer.kind === ts.SyntaxKind.CallExpression) {
			// handle require('./template.html')
			const call = <ts.CallExpression>node.initializer;
			if (call.arguments.length === 1 && call.expression.kind === ts.SyntaxKind.Identifier && call.expression.getText() === "require") {
				const relativePath = (<ts.StringLiteral>call.arguments[0]).text;
				const templatePath = path.join(path.dirname(this.file.path), relativePath);

				return <IComponentTemplate>{ path: templatePath, pos: { line: 0, character: 0 } };
			}
		}
	}

	private createTemplateFromUrl(node: ts.PropertyAssignment) {
		if (!node) {
			return undefined;
		}

		let value = <ts.StringLiteral>node.initializer;
		let templatePath = path.join(workspaceRoot, value.text);

		return <IComponentTemplate>{ path: templatePath, pos: { line: 0, character: 0 } };
	}

	private createBinding = (node: ts.PropertyAssignment): IComponentBinding => {
		let binding = <IComponentBinding>{};
		binding.name = node.name.getText(this.file.sourceFile);
		binding.type = (<ts.StringLiteral>node.initializer).text;
		binding.htmlName = decamelize(binding.name, '-');
		binding.pos = this.file.sourceFile.getLineAndCharacterOfPosition(node.initializer.pos);

		return binding;
	}

	private createControllerAlias(node: ts.PropertyAssignment): string {
		if (!node) {
			return '$ctrl';
		}

		let value = <ts.StringLiteral>node.initializer;
		return value.text;
	}
}