import { TypescriptParser, isAngularModule } from '../typescriptParser';
import { SourceFile } from '../sourceFile';
import { Directive, DEFAULT_RESTRICT } from './directive';
import * as ts from 'typescript';
import _ = require('lodash');

export class DirectiveParser {
	private results: Directive[] = [];
	private tsParser: TypescriptParser;

	constructor(private file: SourceFile) {
		this.tsParser = new TypescriptParser(file);
	}

	public parse = async () => {
		this.parseChildren(this.tsParser.file.sourceFile);

		return this.results;
	}

	private parseChildren = (node: ts.Node) => {
		if (ts.isClassDeclaration(node)) {
			const directive = this.parseClass(node);

			this.results.push(directive);
		} else if (ts.isCallExpression(node)) {
			if (isAngularModule(node.expression)) {
				const directiveCall = this.findDirectiveRegistration(node.parent);

				const name = directiveCall.arguments[0] as ts.StringLiteral;
				const className = this.getClassName(directiveCall.arguments[1]);

				if (className) {
					const directive = this.results.find(c => c.className === className);
					if (directive) {
						directive.name = name.text;
						directive.htmlName = _.kebabCase(name.text);
					}
				}
			} else {
				node.getChildren().forEach(this.parseChildren);
			}
		} else {
			node.getChildren().forEach(this.parseChildren);
		}
	}

	private getClassName = (node: ts.Expression) => {
		if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
			&& ts.isIdentifier(node.expression.expression)) {
			// .directive('directive', DirectiveClass.factoryMethod())
			return node.expression.expression.text;
		}

		// angular.module('app').directive('isolateForm', () => new IsolateFormDirective());
		// angular.module('app').directive('isolateForm', function() {return new IsolateFormDirective()));
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
