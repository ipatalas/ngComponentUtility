import { TypescriptParser, isAngularModule } from '../typescriptParser';
import { SourceFile } from '../sourceFile';
import { Directive, DEFAULT_RESTRICT } from './directive';
import * as ts from 'typescript';
import _ = require('lodash');
import { ConfigParser } from '../configParser';

export class DirectiveParser {
	private results: Directive[] = [];
	private tsParser: TypescriptParser;

	constructor(private file: SourceFile) {
		this.tsParser = new TypescriptParser(file);
	}

	public parse = async () => {
		this.parseChildren(this.tsParser.file.sourceFile);

		return this.results.filter(d => d.name);
	}

	private parseChildren = (node: ts.Node) => {
		if (ts.isClassDeclaration(node)) {
			const directive = this.parseClass(node);

			this.results.push(directive);
		} else if (ts.isCallExpression(node) && isAngularModule(node.expression)) {
			const directiveCall = this.findDirectiveRegistration(node.parent);

			if (directiveCall) {
				const name = directiveCall.arguments[0] as ts.StringLiteral;
				const className = this.getClassName(directiveCall.arguments[1]);

				if (className) {
					const directive = this.results.find(c => c.className === className);
					if (directive) {
						directive.name = name.text;
						directive.htmlName = _.kebabCase(name.text);
					}
				} else {
					this.parseFunctionBasedDirective(directiveCall.arguments[1], name.text);
				}
			}
		} else if (ts.isIdentifier(node)) {
			this.tsParser.addIdentifier(node);
		} else {
			node.getChildren().forEach(this.parseChildren);
		}
	}

	private parseFunctionBasedDirective = (node: ts.Node, directiveName: string) => {
		// angular.module('app').directive('functionDirective', () => ({restrict: 'E'}));
		// angular.module('app').directive('functionDirective', function() { return {restrict: 'E'}; });
		if (ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isFunctionDeclaration(node)) {
			let obj: ts.Expression;

			if (ts.isBlock(node.body)) {
				const returnStatement = node.body.statements.find(s => ts.isReturnStatement(s)) as ts.ReturnStatement;
				obj = ts.isParenthesizedExpression(returnStatement.expression) && returnStatement.expression.expression || returnStatement.expression;
			} else if (ts.isParenthesizedExpression(node.body)) {
				obj = node.body.expression;
			}

			const directive = this.parseObjectLiteral(obj, directiveName);

			if (directive) {
				this.results.push(directive);
			}
		} else if (ts.isArrayLiteralExpression(node)) {
			// angular.module('app').directive('functionDirective', ['$interval', 'dateFilter', function ($interval, dateFilter) {...} ]);
			const func = _.last(node.elements);
			if (ts.isFunctionExpression(func)) {
				this.parseFunctionBasedDirective(func, directiveName);
			}
		} else if (ts.isIdentifier(node)) {
			// angular.module('app').directive('functionDirective', FunctionName);
			// angular.module('app').directive('functionDirective', ArrowFunctionName);
			const func = this.tsParser.getFunctionDeclaration(node);
			if (func) {
				this.parseFunctionBasedDirective(func, directiveName);
			} else {
				const varDeclaration = this.tsParser.getVariableDefinition(node);
				if (varDeclaration) {
					this.parseFunctionBasedDirective(varDeclaration.initializer, directiveName);
				}
			}
		}
	}

	private getClassName = (node: ts.Expression) => {
		if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
			&& ts.isIdentifier(node.expression.expression)) {
			// .directive('directive', DirectiveClass.factoryMethod())
			return node.expression.expression.text;
		} else if (ts.isArrowFunction(node)) {
			// angular.module('app').directive('isolateForm', () => new IsolateFormDirective());
			// angular.module('app').directive('isolateForm', () => { return new IsolateFormDirective() });
			const className = this.getClassNameFromNewExpression(node.body) || this.getClassNameFromBlock(node.body);
			if (className) {
				return className;
			}
		} else if (ts.isFunctionExpression(node)) {
			// angular.module('app').directive('isolateForm', function() {return new IsolateFormDirective()));
			return this.getClassNameFromBlock(node.body);
		}
	}

	private getClassNameFromBlock = (node: ts.Node) => {
		if (ts.isBlock(node)) {
			const returnStatement = node.statements.find(s => ts.isReturnStatement(s)) as ts.ReturnStatement;
			if (returnStatement) {
				return this.getClassNameFromNewExpression(returnStatement.expression);
			}
		}
	}

	private getClassNameFromNewExpression = (exp: ts.Node) => {
		if (ts.isNewExpression(exp) && ts.isIdentifier(exp.expression)) {
			return exp.expression.text;
		}
	}

	private parseObjectLiteral(node: ts.Expression, name: string) {
		if (!node || !ts.isObjectLiteralExpression(node)) {
			return;
		}

		const directive = new Directive();
		directive.path = this.file.path;
		directive.pos = this.file.sourceFile.getLineAndCharacterOfPosition(node.pos);
		directive.name = name;
		directive.htmlName = _.kebabCase(name);

		const config = new ConfigParser(node);
		const restrictNode = config.get('restrict');

		directive.restrict = this.tsParser.getStringValueFromNode(restrictNode) || DEFAULT_RESTRICT;

		return directive;
	}

	private parseClass(node: ts.ClassDeclaration) {
		const directive = new Directive();
		directive.path = this.file.path;
		directive.className = node.name.text;
		directive.pos = this.file.sourceFile.getLineAndCharacterOfPosition(node.members.pos);

		node.members.filter(ts.isPropertyDeclaration).forEach(member => {
			if (ts.isIdentifier(member.name) && member.name.text === 'restrict' && member.initializer) {
				directive.restrict = this.tsParser.getStringValueFromNode(member.initializer);
			}
		});

		if (!directive.restrict) {
			const ctor = node.members.find(ts.isConstructorDeclaration);
			if (ctor && ctor.body) {
				ctor.body.statements.filter(s => ts.isExpressionStatement(s)).forEach((s: ts.ExpressionStatement) => {
					// this.restrict = 'E';
					if (ts.isBinaryExpression(s.expression) && ts.isPropertyAccessExpression(s.expression.left) &&
						s.expression.left.name.text === 'restrict' && s.expression.left.expression.kind === ts.SyntaxKind.ThisKeyword) {
						directive.restrict = this.tsParser.getStringValueFromNode(s.expression.right);
					}
				});
			}
		}

		directive.restrict = directive.restrict || DEFAULT_RESTRICT;
		return directive;
	}

	private findDirectiveRegistration = (node: ts.Node): ts.CallExpression => {
		if (ts.isPropertyAccessExpression(node)) {
			if (node.name.text === 'directive' && node.parent && ts.isCallExpression(node.parent)) {
				if (node.parent.arguments.length === 2) {
					return node.parent;
				}
			}
		}

		if (node.parent) {
			return this.findDirectiveRegistration(node.parent);
		}
	}
}
