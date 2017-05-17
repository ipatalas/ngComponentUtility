import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from "path";
import * as decamelize from 'decamelize';
import { SourceFile } from "../sourceFile";
import { Controller } from "../controller/controller";
import { Component, IComponentTemplate, IComponentBinding } from "./component";
import { workspaceRoot } from '../vsc';
import { TypescriptParser } from "../typescriptParser";

export class ComponentParser {
	private results: Component[] = [];
	private tsParser: TypescriptParser;

	constructor(private file: SourceFile, private controllers: Controller[]) {
		this.tsParser = new TypescriptParser(file.sourceFile);
	}

	public parse = async () => {
		await this.parseChildren(this.tsParser.sourceFile);

		return this.results;
	}

	private parseChildren = async (node: ts.Node) => {
		if (node.kind === ts.SyntaxKind.CallExpression) {
			const call = node as ts.CallExpression;

			if (call.expression.kind === ts.SyntaxKind.PropertyAccessExpression
				&& (call.expression as ts.PropertyAccessExpression).name.text === 'component'
				&& call.arguments.length === 2) {
				const componentNameNode = call.arguments[0];
				const componentConfigObj = await this.getComponentConfigObj(call.arguments[1]);

				const component = this.createComponent(componentNameNode, componentConfigObj);
				if (component) {
					this.results.push(component);
				}
			} else {
				await Promise.all(call.getChildren().map(item => this.parseChildren(item)));
			}
		} else if (node.kind === ts.SyntaxKind.Identifier) {
			this.tsParser.addIdentifier(node as ts.Identifier);
		} else {
			await Promise.all(node.getChildren().map(item => this.parseChildren(item)));
		}
	}

	private getComponentConfigObj = async (configNode: ts.Expression) => {
		const componentConfigObj = this.tsParser.getObjectLiteralValueFromNode(configNode);
		if (componentConfigObj) {
			return Promise.resolve(componentConfigObj);
		}

		const importDeclaration = this.tsParser.getImportDeclaration(configNode as ts.Identifier);
		if (importDeclaration) {
			const module = importDeclaration.moduleSpecifier as ts.StringLiteral;
			const modulePath = path.resolve(path.dirname(this.file.path), module.text + '.ts');
			if (fs.existsSync(modulePath)) {
				const sourceFile = await SourceFile.parse(modulePath);
				this.tsParser = new TypescriptParser(sourceFile.sourceFile);
				const varDeclaration = this.tsParser.getExportedVariable(sourceFile.sourceFile, (configNode as ts.Identifier).text);
				if (varDeclaration) {
					if (varDeclaration.initializer.kind === ts.SyntaxKind.ObjectLiteralExpression) {
						return Promise.resolve(varDeclaration.initializer as ts.ObjectLiteralExpression);
					}
				}
			}
		}
	}

	private createComponent = (componentNameNode: ts.Expression, configObj: ts.ObjectLiteralExpression) => {
		const componentName = this.tsParser.getStringValueFromNode(componentNameNode);
		if (!componentName) {
			return undefined;
		}

		const component = new Component();
		component.path = this.tsParser.sourceFile.fullpath;
		component.name = componentName;
		component.htmlName = decamelize(componentName, '-');
		component.pos = this.tsParser.sourceFile.getLineAndCharacterOfPosition(componentNameNode.pos);

		const config = this.tsParser.translateObjectLiteral(configObj);

		const bindingsObj = config['bindings'];
		if (bindingsObj) {
			const bindingsProps = bindingsObj.initializer as ts.ObjectLiteralExpression;
			component.bindings.push(...bindingsProps.properties.map(this.createBinding));
		}

		component.template = this.createTemplateFromUrl(config['templateUrl']);
		if (!component.template) {
			component.template = this.createTemplate(config['template']);
		}

		component.controllerAs = this.createControllerAlias(config['controllerAs']);

		if (this.controllers && this.controllers.length > 0) {
			component.controller = this.createController(config['controller']);
			if (!component.controller) {
				// tslint:disable-next-line:no-console
				console.log(`Controller for ${component.name} is not defined`);
			}
		}

		return component;
	}

	private createController = (node: ts.PropertyAssignment): Controller => {
		if (!node) {
			return undefined;
		}

		if (node.initializer.kind === ts.SyntaxKind.StringLiteral) {
			return this.controllers.find(c => c.name === (node.initializer as ts.StringLiteral).text);
		} else if (node.initializer.kind === ts.SyntaxKind.Identifier) {
			return this.controllers.find(c => c.className === (node.initializer as ts.Identifier).text);
		}
	}

	private createTemplate = (node: ts.PropertyAssignment): IComponentTemplate => {
		if (!node) {
			return undefined;
		}

		if (node.initializer.kind === ts.SyntaxKind.StringLiteral || node.initializer.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
			const pos = this.tsParser.sourceFile.getLineAndCharacterOfPosition(node.initializer.getStart(this.tsParser.sourceFile));
			const literal = node.initializer as ts.LiteralExpression;

			return { path: this.file.path, pos, body: literal.text } as IComponentTemplate;
		} else if (node.initializer.kind === ts.SyntaxKind.CallExpression) {
			// handle require('./template.html')
			const call = node.initializer as ts.CallExpression;
			if (call.arguments.length === 1 && call.expression.kind === ts.SyntaxKind.Identifier && call.expression.getText() === "require") {
				const relativePath = (call.arguments[0] as ts.StringLiteral).text;
				const templatePath = path.join(path.dirname(this.file.path), relativePath);

				return { path: templatePath, pos: { line: 0, character: 0 } } as IComponentTemplate;
			}
		}
	}

	private createTemplateFromUrl(node: ts.PropertyAssignment) {
		if (!node) {
			return undefined;
		}

		const value = this.tsParser.getStringValueFromNode(node.initializer);
		if (value) {
			const templatePath = path.join(workspaceRoot, value);

			return { path: templatePath, pos: { line: 0, character: 0 } } as IComponentTemplate;
		}
	}

	private createBinding = (node: ts.PropertyAssignment): IComponentBinding => {
		const binding = {} as IComponentBinding;
		binding.name = node.name.getText(this.tsParser.sourceFile);
		binding.type = (node.initializer as ts.StringLiteral).text;
		binding.htmlName = decamelize(binding.name, '-');
		binding.pos = this.tsParser.sourceFile.getLineAndCharacterOfPosition(node.initializer.pos);

		return binding;
	}

	private createControllerAlias(node: ts.PropertyAssignment): string {
		if (!node) {
			return '$ctrl';
		}

		const value = node.initializer as ts.StringLiteral;
		return value.text;
	}
}
