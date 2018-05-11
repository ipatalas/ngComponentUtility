import * as ts from 'typescript';
import { SourceFile, ISourceFile } from './sourceFile';
import * as path from 'path';
import * as fs from 'fs';

export function isTsKind<T extends ts.Node = ts.Node>(node: ts.Node, syntaxKind: ts.SyntaxKind): node is T {
	return node.kind === syntaxKind;
}

export class TypescriptParser {
	private readonly identifierNodes: Map<string, ts.Node[]> = new Map<string, ts.Node[]>();

	public readonly sourceFile: ISourceFile;

	get path() {
		return this.file.path;
	}

	constructor(public file: SourceFile) {
		this.sourceFile = file.sourceFile;
	}

	public addIdentifier = (node: ts.Identifier) => {
		if (!this.identifierNodes.has(node.text)) {
			this.identifierNodes.set(node.text, []);
		}

		this.identifierNodes.get(node.text).push(node);
	}

	public findNode = (position: number) => {
		let found: ts.Node = null;

		this.sourceFile.forEachChild(visitNode);

		return found;

		function visitNode(node: ts.Node) {
			if (node.pos < position && position < node.end) {
				if (node.getChildCount() === 0) {
					found = node;
					return;
				}

				node.forEachChild(visitNode);
			}
		}
	}

	public getStringValueFromNode = (node: ts.Expression): string => {
		if (node.kind === ts.SyntaxKind.StringLiteral || node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
			return (node as ts.LiteralExpression).text;
		} else if (node.kind === ts.SyntaxKind.Identifier) {
			return this.getStringVariableValue(node as ts.Identifier);
		} else if (node.kind === ts.SyntaxKind.PropertyAccessExpression) {
			const member = this.getPropertyAccessMember(node as ts.PropertyAccessExpression);
			if (member) {
				return this.getStringValueFromNode(member.initializer);
			}
		}
	}

	public getObjectLiteralValueFromNode = (node: ts.Expression): ts.ObjectLiteralExpression => {
		if (node.kind === ts.SyntaxKind.ObjectLiteralExpression) {
			return node as ts.ObjectLiteralExpression;
		} else if (node.kind === ts.SyntaxKind.AsExpression) {
			return (node as ts.AsExpression).expression as ts.ObjectLiteralExpression;
		} else if (node.kind === ts.SyntaxKind.Identifier) {
			return this.getObjectLiteralVariableValue(node as ts.Identifier);
		} else if (node.kind === ts.SyntaxKind.PropertyAccessExpression) {
			const member = this.getPropertyAccessMember(node as ts.PropertyAccessExpression);
			if (member) {
				return this.getObjectLiteralValueFromNode(member.initializer);
			}
		}
	}

	private getImportModuleSpecifier = (identifier: ts.Identifier): ts.Expression => {
		if (this.identifierNodes.has(identifier.text)) {
			const usages = this.identifierNodes.get(identifier.text);
			const node = usages.find(u => u.parent.kind === ts.SyntaxKind.ImportSpecifier || u.parent.kind === ts.SyntaxKind.ImportClause);

			const result = this.closestParent<ts.ImportDeclaration>(node.parent, ts.SyntaxKind.ImportDeclaration);

			return result && result.moduleSpecifier;
		} else {
			const result = this.sourceFile.statements
				.filter(s => s.kind === ts.SyntaxKind.ExportDeclaration)
				.find((s: ts.ExportDeclaration) => this.isExportDeclarationFor(s, identifier)) as ts.ExportDeclaration;

			return result && result.moduleSpecifier;
		}
	}

	public getParserFromImport = async (identifier: ts.Identifier) => {
		const module = this.getImportModuleSpecifier(identifier) as ts.StringLiteral;
		if (module) {
			const extension = path.extname(this.path);
			let filename = module.text;

			if (!filename.endsWith(extension)) {
				filename += extension;
			}

			let modulePath = path.resolve(path.dirname(this.path), filename);
			if (!fs.existsSync(modulePath)) {
				modulePath = path.resolve(path.dirname(this.path), module.text + '/index' + extension);
			}

			if (fs.existsSync(modulePath)) {
				const sourceFile = await SourceFile.parse(modulePath);
				return new TypescriptParser(sourceFile);
			}
		}
	}

	private isExportDeclarationFor = (declaration: ts.ExportDeclaration, identifier: ts.Identifier): boolean => {
		const exportClause = declaration.exportClause;

		return exportClause.elements.some(spec => spec.name.text === identifier.text);
	}

	public closestParent = <TNode extends ts.Node>(node: ts.Node, kind: ts.SyntaxKind) => {
		while (node && node.kind !== kind) {
			node = node.parent;
		}

		return node as TNode;
	}

	private getVariableDefinition = (identifier: ts.Identifier) => {
		if (this.identifierNodes.has(identifier.text)) {
			const usages = this.identifierNodes.get(identifier.text);
			const varDeclaration = usages.find(u => u.parent.kind === ts.SyntaxKind.VariableDeclaration);
			if (varDeclaration) {
				return varDeclaration.parent as ts.VariableDeclaration;
			}
		}
	}

	public getClassDefinition = (identifier: ts.Identifier) => {
		if (this.identifierNodes.has(identifier.text)) {
			const usages = this.identifierNodes.get(identifier.text);
			const classDeclaration = usages.find(u => u.parent.kind === ts.SyntaxKind.ClassDeclaration);
			if (classDeclaration) {
				return classDeclaration.parent as ts.ClassDeclaration;
			}
		}
	}

	private getPropertyAccessMember = (pae: ts.PropertyAccessExpression) => {
		if (pae.expression.kind === ts.SyntaxKind.Identifier) {
			const className = (pae.expression as ts.Identifier).text;

			if (this.identifierNodes.has(className)) {
				const usages = this.identifierNodes.get(className);
				const classIdentifier = usages.find(u => u.parent.kind === ts.SyntaxKind.ClassDeclaration);
				if (classIdentifier) {
					const classDeclaration = classIdentifier.parent as ts.ClassDeclaration;

					return classDeclaration.members
						.filter(m => m.kind === ts.SyntaxKind.PropertyDeclaration)
						.find(m => m.name.getText(this.sourceFile) === pae.name.text) as ts.PropertyDeclaration;
				}
			}
		}
	}

	private getStringVariableValue = (identifier: ts.Identifier) => {
		const varDeclaration = this.getVariableDefinition(identifier);

		if (varDeclaration && varDeclaration.initializer.kind === ts.SyntaxKind.StringLiteral) {
			return (varDeclaration.initializer as ts.StringLiteral).text;
		}
	}

	private getObjectLiteralVariableValue = (identifier: ts.Identifier) => {
		const varDeclaration = this.getVariableDefinition(identifier);

		if (varDeclaration && varDeclaration.initializer.kind === ts.SyntaxKind.ObjectLiteralExpression) {
			return varDeclaration.initializer as ts.ObjectLiteralExpression;
		}
	}

	public getExportedVariable = (node: ts.Node, name: string): ts.VariableDeclaration => {
		if (node.kind === ts.SyntaxKind.Identifier && (node as ts.Identifier).text === name && node.parent.kind === ts.SyntaxKind.VariableDeclaration) {
			const varStatement = this.closestParent<ts.VariableStatement>(node.parent, ts.SyntaxKind.VariableStatement);
			if (varStatement && varStatement.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
				return node.parent as ts.VariableDeclaration;
			}
		}

		return ts.forEachChild(node, n => this.getExportedVariable(n, name));
	}

	public getExportedClass = (node: ts.Node, name: string): ts.ClassDeclaration => {
		if (node.kind === ts.SyntaxKind.Identifier && (node as ts.Identifier).text === name && node.parent.kind === ts.SyntaxKind.ClassDeclaration) {
			const classDeclaration = this.closestParent<ts.ClassDeclaration>(node.parent, ts.SyntaxKind.ClassDeclaration);
			if (classDeclaration && classDeclaration.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
				return node.parent as ts.ClassDeclaration;
			}
		}

		return ts.forEachChild(node, n => this.getExportedClass(n, name));
	}
}
