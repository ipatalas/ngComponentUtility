import * as ts from 'typescript';
import * as path from 'path';
import * as decamelize from 'decamelize';
import { SourceFile } from '../sourceFile';
import { Controller } from '../controller/controller';
import { Component, IComponentTemplate } from './component';
import { workspaceRoot } from '../vsc';
import { TypescriptParser } from '../typescriptParser';
import { ConfigParser } from '../configParser';
import { logVerbose } from '../logging';
import { ComponentBinding } from './componentBinding';

interface IComponentToImport {
	nameNode: ts.Expression;
	identifier: ts.Identifier;
	kind: ts.SyntaxKind;
}

export class ComponentParser {
	private results: Component[] = [];
	private tsParser: TypescriptParser;
	private componentTsParser: Map<string, TypescriptParser>;
	private componentsToImport: IComponentToImport[] = [];

	constructor(private file: SourceFile, private controllers: Controller[]) {
		this.tsParser = new TypescriptParser(file);
		this.componentTsParser = new Map<string, TypescriptParser>();
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

		component.template = this.createTemplateFromUrl(config.get('templateUrl'), parser);
		if (!component.template) {
			component.template = this.createTemplate(config.get('template'), parser);
			if (!component.template) {
				logVerbose(`Template for ${component.name} not found (member completion and Go To Definition for this component will not work)`);
			}
		}

		component.controllerAs = this.createControllerAlias(config.get('controllerAs'));

		if (this.controllers && this.controllers.length > 0) {
			const name = config.get('controller');
			if (name) {
				if (name.kind === ts.SyntaxKind.StringLiteral) {
					component.controllerName = (name as ts.StringLiteral).text;
				} else if (name.kind === ts.SyntaxKind.Identifier) {
					component.controllerClassName = (name as ts.Identifier).text;
				}

				component.controller = this.createController(component);

				if (!component.controller) {
					logVerbose(`Controller for ${component.name} not found (member completion and Go To Definition for this component will not work)`);
				}
			}
		}

		return component;
	}

	private createController = (component: Component): Controller => {
		if (component.controllerName) {
			return this.controllers.find(c => c.name === component.controllerName);
		} else if (component.controllerClassName) {
			return this.controllers.find(c => c.className === component.controllerClassName);
		}
	}

	private createTemplate = (node: ts.Expression, parser: TypescriptParser): IComponentTemplate => {
		if (!node) {
			return undefined;
		}

		if (node.kind === ts.SyntaxKind.StringLiteral || node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
			const pos = parser.sourceFile.getLineAndCharacterOfPosition(node.getStart(parser.sourceFile));
			const literal = node as ts.LiteralExpression;

			return { path: this.file.path, pos, body: literal.text } as IComponentTemplate;
		} else if (node.kind === ts.SyntaxKind.CallExpression) {
			// handle require('./template.html')
			const call = node as ts.CallExpression;
			if (call.arguments.length === 1 && call.expression.kind === ts.SyntaxKind.Identifier && call.expression.getText() === 'require') {
				const relativePath = (call.arguments[0] as ts.StringLiteral).text;
				const templatePath = path.join(path.dirname(parser.path), relativePath);

				return { path: templatePath, pos: { line: 0, character: 0 } } as IComponentTemplate;
			}
		} else if (node.kind === ts.SyntaxKind.Identifier) {
			// handle template: template
			const variableStatement = parser.sourceFile.statements
				.find(statement => statement.kind === ts.SyntaxKind.VariableStatement) as ts.VariableStatement;
			const declarations = variableStatement.declarationList.declarations;
			const declaration = declarations.find(declaration => declaration.name.getText() === node.getText());
			// pass CallExpression (e.g. require('./template.html'))
			return this.createTemplate(declaration.initializer, parser);
		}
	}

	private createTemplateFromUrl(node: ts.Expression, parser: TypescriptParser) {
		if (!node) {
			return undefined;
		}

		const value = parser.getStringValueFromNode(node);
		if (value) {
			const templatePath = path.join(workspaceRoot, value);

			return { path: templatePath, pos: { line: 0, character: 0 } } as IComponentTemplate;
		}
	}

	private createControllerAlias(node: ts.Expression): string {
		if (!node) {
			return '$ctrl';
		}

		const value = node as ts.StringLiteral;
		return value.text;
	}
}
