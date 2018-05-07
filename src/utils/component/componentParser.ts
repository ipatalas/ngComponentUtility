import * as ts from 'typescript';
import * as decamelize from 'decamelize';
import { SourceFile } from '../sourceFile';
import { Component } from './component';
import { TypescriptParser } from '../typescriptParser';
import { ConfigParser } from '../configParser';
import { logVerbose } from '../logging';
import { ComponentBinding } from './componentBinding';
import { TemplateParser } from '../templateParser';
import { ControllerHelper } from '../controllerHelper';

interface IComponentToImport {
	nameNode: ts.Expression;
	identifier: ts.Identifier;
	kind: ts.SyntaxKind;
}

export class ComponentParser {
	private results: Component[] = [];
	private tsParser: TypescriptParser;
	private templateParser: TemplateParser;
	private componentTsParser: Map<string, TypescriptParser>;
	private componentsToImport: IComponentToImport[] = [];

	constructor(file: SourceFile, private controllerHelper: ControllerHelper) {
		this.tsParser = new TypescriptParser(file);
		this.componentTsParser = new Map<string, TypescriptParser>();
		this.templateParser = new TemplateParser();
	}

	public parse = async () => {
		this.parseChildren(this.tsParser.sourceFile);

		if (this.componentsToImport.length > 0) {
			for (const toImport of this.componentsToImport) {
				const componentName = this.tsParser.getStringValueFromNode(toImport.nameNode);

				const config = toImport.kind === ts.SyntaxKind.NewExpression ?
					await this.getExportedClassDeclaration(componentName, toImport.identifier) :
					await this.getExportedVariable(componentName, toImport.identifier);

				const component = this.createComponent(toImport.nameNode, config, true);
				if (component) {
					this.results.push(component);
				}
			}
		}

		return this.results;
	}

	private parseChildren = (node: ts.Node) => {
		if (node.kind === ts.SyntaxKind.CallExpression) {
			const call = node as ts.CallExpression;

			if (call.expression.kind === ts.SyntaxKind.PropertyAccessExpression
				&& (call.expression as ts.PropertyAccessExpression).name.text === 'component'
				&& call.arguments.length === 2) {
				const componentNameNode = call.arguments[0];

				const componentConfigObj = this.getComponentConfig(call.arguments[1], componentNameNode);
				const component = this.createComponent(componentNameNode, componentConfigObj);
				if (component) {
					this.results.push(component);
				}

				call.expression.getChildren().map(item => this.parseChildren(item));
			} else {
				call.getChildren().map(item => this.parseChildren(item));
			}
		} else if (node.kind === ts.SyntaxKind.Identifier) {
			this.tsParser.addIdentifier(node as ts.Identifier);
		} else {
			node.getChildren().map(item => this.parseChildren(item));
		}
	}

	private getComponentConfig = (configNode: ts.Expression, componentNameNode: ts.Expression): ts.ObjectLiteralExpression | ts.ClassDeclaration => {
		const componentConfigObj = this.tsParser.getObjectLiteralValueFromNode(configNode);

		if (componentConfigObj) {
			return componentConfigObj;
		}

		if (configNode.kind === ts.SyntaxKind.NewExpression) {
			const identifier = (configNode as ts.NewExpression).expression as ts.Identifier;

			const classDeclaration = this.tsParser.getClassDefinition(identifier);
			if (classDeclaration) {
				return classDeclaration;
			}

			this.componentsToImport.push({
				nameNode: componentNameNode,
				identifier,
				kind: ts.SyntaxKind.NewExpression
			});
		} else if (configNode.kind === ts.SyntaxKind.Identifier) {
			this.componentsToImport.push({
				nameNode: componentNameNode,
				identifier: configNode as ts.Identifier,
				kind: ts.SyntaxKind.Identifier
			});
		} else {
			throw this.errorNotSupported();
		}
	}

	private getExportedVariable = async (componentName: string, identifier: ts.Identifier) => {
		let parser = await this.tsParser.getParserFromImport(identifier);

		while (parser) {
			const varDeclaration = parser.getExportedVariable(parser.sourceFile, identifier.text);
			if (varDeclaration && varDeclaration.initializer.kind === ts.SyntaxKind.ObjectLiteralExpression) {
				this.componentTsParser.set(componentName, parser);
				return Promise.resolve(varDeclaration.initializer as ts.ObjectLiteralExpression);
			} else {
				parser = await parser.getParserFromImport(identifier);
			}
		}

		return Promise.reject(this.errorNotSupported());
	}

	private getExportedClassDeclaration = async (componentName: string, identifier: ts.Identifier) => {
		let classDeclaration: ts.ClassDeclaration;
		let parser = await this.tsParser.getParserFromImport(identifier);

		while (parser) {
			classDeclaration = parser.getExportedClass(parser.sourceFile, identifier.text);
			if (classDeclaration) {
				this.componentTsParser.set(componentName, parser);
				return Promise.resolve(classDeclaration);
			} else {
				parser = await parser.getParserFromImport(identifier as ts.Identifier);
			}
		}

		return Promise.reject(this.errorNotSupported());
	}

	private errorNotSupported = () => new Error('This component configuration type is not supported yet - please raise an issue and provide an example');

	private createComponent = (componentNameNode: ts.Expression, configObj: ts.ObjectLiteralExpression | ts.ClassDeclaration, isImported?: boolean) => {
		const componentName = this.tsParser.getStringValueFromNode(componentNameNode);
		if (!componentName || !configObj) {
			return undefined;
		}

		const parser = this.componentTsParser.get(componentName) || this.tsParser;

		const component = new Component();
		component.path = parser.sourceFile.fullpath;
		component.name = componentName;
		component.htmlName = decamelize(componentName, '-');
		component.pos = parser.sourceFile.getLineAndCharacterOfPosition(
			isImported ? ((configObj as ts.ClassDeclaration).name || configObj).pos : componentNameNode.pos
		);

		const config = new ConfigParser(configObj);
		const bindingsObj = config.get('bindings');
		if (bindingsObj) {
			const bindingsProps = bindingsObj as ts.ObjectLiteralExpression;
			component.bindings.push(...bindingsProps.properties.map(b => new ComponentBinding(b as ts.PropertyAssignment, parser)));
		}

		component.template = this.templateParser.createTemplate(config, parser);
		if (!component.template) {
			logVerbose(`Template for ${component.name} not found (member completion and Go To Definition for this component will not work)`);
		}

		if (!this.controllerHelper.prepareController(component, config)) {
			logVerbose(`Controller for ${component.name} not found (member completion and Go To Definition for this component will not work)`);
		}

		return component;
	}
}
