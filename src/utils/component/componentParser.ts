import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from "path";
import * as decamelize from 'decamelize';
import { SourceFile } from "../sourceFile";
import { Controller } from "../controller/controller";
import { Component, IComponentTemplate, IComponentBinding } from "./component";
import { workspaceRoot } from '../vsc';
import { TypescriptParser } from "../typescriptParser";
import { ConfigParser } from '../configParser';

export class ComponentParser {
	private results: Component[] = [];
	private tsParser: TypescriptParser;
	private isImported: boolean = false;

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
				const componentConfigObj = await this.getComponentConfig(call.arguments[1]);

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

	private getComponentConfig = async (configNode: ts.Expression): Promise<ts.ObjectLiteralExpression | ts.ClassDeclaration> => {
		const componentConfigObj = this.tsParser.getObjectLiteralValueFromNode(configNode);
		if (componentConfigObj) {
			return Promise.resolve(componentConfigObj);
		}

		if (configNode.kind === ts.SyntaxKind.NewExpression) {
			const newExpression = configNode as ts.NewExpression;
			const parser = await this.getImportedFileParser(newExpression.expression as ts.Identifier);
			if (parser) {
				this.tsParser = parser;
				const classDeclaration = this.tsParser.getExportedClass(this.tsParser.sourceFile, (newExpression.expression as ts.Identifier).text);
				if (classDeclaration) {
					this.isImported = true;
					return Promise.resolve(classDeclaration);
				}
			}
		}

		if (configNode.kind === ts.SyntaxKind.Identifier) {
			const parser = await this.getImportedFileParser(configNode as ts.Identifier);
			if (parser) {
				this.tsParser = parser;
				const varDeclaration = this.tsParser.getExportedVariable(this.tsParser.sourceFile, (configNode as ts.Identifier).text);
				if (varDeclaration && varDeclaration.initializer.kind === ts.SyntaxKind.ObjectLiteralExpression) {
					this.isImported = true;
					return Promise.resolve(varDeclaration.initializer as ts.ObjectLiteralExpression);
				}
			}
		}

		return Promise.reject(new Error('This component configuration type is not supported yet - please raise an issue and provide an example'));
	}

	private getImportedFileParser = async (identifier: ts.Identifier) => {
		const importDeclaration = this.tsParser.getImportDeclaration(identifier);
		if (importDeclaration) {
			const module = importDeclaration.moduleSpecifier as ts.StringLiteral;
			const extension = path.extname(this.file.path);
			const modulePath = path.resolve(path.dirname(this.file.path), module.text + extension);
			if (fs.existsSync(modulePath)) {
				const sourceFile = await SourceFile.parse(modulePath);
				return Promise.resolve(new TypescriptParser(sourceFile.sourceFile));
			}
		}
	}

	private createComponent = (componentNameNode: ts.Expression, configObj: ts.ObjectLiteralExpression | ts.ClassDeclaration) => {
		const componentName = this.tsParser.getStringValueFromNode(componentNameNode);
		if (!componentName) {
			return undefined;
		}

		const component = new Component();
		component.path = this.tsParser.sourceFile.fullpath;
		component.name = componentName;
		component.htmlName = decamelize(componentName, '-');
		component.pos = this.tsParser.sourceFile.getLineAndCharacterOfPosition(
			this.isImported ? (configObj.name || configObj).pos : componentNameNode.pos
		);

		const config = new ConfigParser(configObj);
		const bindingsObj = config.get('bindings');
		if (bindingsObj) {
			const bindingsProps = bindingsObj as ts.ObjectLiteralExpression;
			component.bindings.push(...bindingsProps.properties.map(this.createBinding));
		}

		component.template = this.createTemplateFromUrl(config.get('templateUrl'));
		if (!component.template) {
			component.template = this.createTemplate(config.get('template'));
		}

		component.controllerAs = this.createControllerAlias(config.get('controllerAs'));

		if (this.controllers && this.controllers.length > 0) {
			component.controller = this.createController(config.get('controller'));
			if (!component.controller) {
				// tslint:disable-next-line:no-console
				console.log(`Controller for ${component.name} is not defined`);
			}
		}

		return component;
	}

	private createController = (node: ts.Expression): Controller => {
		if (!node) {
			return undefined;
		}

		if (node.kind === ts.SyntaxKind.StringLiteral) {
			return this.controllers.find(c => c.name === (node as ts.StringLiteral).text);
		} else if (node.kind === ts.SyntaxKind.Identifier) {
			return this.controllers.find(c => c.className === (node as ts.Identifier).text);
		}
	}

	private createTemplate = (node: ts.Expression): IComponentTemplate => {
		if (!node) {
			return undefined;
		}

		if (node.kind === ts.SyntaxKind.StringLiteral || node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
			const pos = this.tsParser.sourceFile.getLineAndCharacterOfPosition(node.getStart(this.tsParser.sourceFile));
			const literal = node as ts.LiteralExpression;

			return { path: this.file.path, pos, body: literal.text } as IComponentTemplate;
		} else if (node.kind === ts.SyntaxKind.CallExpression) {
			// handle require('./template.html')
			const call = node as ts.CallExpression;
			if (call.arguments.length === 1 && call.expression.kind === ts.SyntaxKind.Identifier && call.expression.getText() === "require") {
				const relativePath = (call.arguments[0] as ts.StringLiteral).text;
				const templatePath = path.join(path.dirname(this.tsParser.path), relativePath);

				return { path: templatePath, pos: { line: 0, character: 0 } } as IComponentTemplate;
			}
		}
	}

	private createTemplateFromUrl(node: ts.Expression) {
		if (!node) {
			return undefined;
		}

		const value = this.tsParser.getStringValueFromNode(node);
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

	private createControllerAlias(node: ts.Expression): string {
		if (!node) {
			return '$ctrl';
		}

		const value = node as ts.StringLiteral;
		return value.text;
	}
}
