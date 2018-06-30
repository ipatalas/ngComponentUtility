import * as ts from 'typescript';
import { SourceFile, ISourceFile } from './sourceFile';
import * as path from 'path';
import * as fs from 'fs';

export interface IDeclarationOrDefault {
	varDeclaration?: ts.VariableDeclaration;
	defaultDeclaration?: ts.VariableDeclaration;
}

export function isAngularModule(exp: ts.Expression) {
	return ts.isPropertyAccessExpression(exp) &&
		ts.isIdentifier(exp.expression) && ts.isIdentifier(exp.name) &&
		exp.expression.text === 'angular' && exp.name.text === 'module';
}

export class TypescriptParser {
	private readonly identifierNodes: Map<string, ts.Node[]> = new Map<string, ts.Node[]>();
	private readonly classDefinitions: Map<string, ts.ClassDeclaration> = new Map<string, ts.ClassDeclaration>();

	public readonly sourceFile: ISourceFile;

	get path() {
		return this.file.path;
	}

	constructor(public file: SourceFile) {
		this.sourceFile = file.sourceFile;

		this.sourceFile.statements.forEach(this.topLevelScan);
	}

	private topLevelScan = (node: ts.Node) => {
		if (ts.isClassDeclaration(node) && node.name) {
			this.classDefinitions.set(node.name.text, node);
		} else if (ts.isVariableStatement(node) && node.declarationList) {
			node.declarationList.declarations.forEach((n) => this.addIdentifier(n.name as ts.Identifier));
		}
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
		if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
			return node.text;
		} else if (ts.isIdentifier(node)) {
			return this.getStringVariableValue(node);
		} else if (ts.isPropertyAccessExpression(node)) {
			const member = this.getPropertyAccessMember(node);
			if (member) {
				return this.getStringValueFromNode(member.initializer);
			}
		}
	}

	public getObjectLiteralValueFromNode = (node: ts.Expression): ts.ObjectLiteralExpression => {
		if (ts.isObjectLiteralExpression(node)) {
			return node;
		} else if (ts.isAsExpression(node)) {
			return node.expression as ts.ObjectLiteralExpression;
		} else if (ts.isTypeAssertion(node)) {
			return node.expression as ts.ObjectLiteralExpression;
		} else if (ts.isIdentifier(node)) {
			return this.getObjectLiteralVariableValue(node);
		} else if (ts.isPropertyAccessExpression(node)) {
			const member = this.getPropertyAccessMember(node);
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
				.filter(s => ts.isExportDeclaration(s))
				.find((s: ts.ExportDeclaration) => this.isExportDeclarationFor(s, identifier)) as ts.ExportDeclaration;

			if (result === undefined) {
				// Check for a default export in the format of: 'export default expression;'
				const defaultResult = this.sourceFile.statements
					.find(s => s.kind === ts.SyntaxKind.ExportAssignment) as ts.ExportAssignment;

				return defaultResult && defaultResult.expression;
			} else {
				return result && result.moduleSpecifier;
			}
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
		return this.classDefinitions.get(identifier.text);
	}

	private getPropertyAccessMember = (pae: ts.PropertyAccessExpression) => {
		if (pae.expression.kind === ts.SyntaxKind.Identifier) {
			const className = (pae.expression as ts.Identifier).text;

			const classDeclaration = this.classDefinitions.get(className);
			if (classDeclaration) {
				return classDeclaration.members
					.filter(m => m.kind === ts.SyntaxKind.PropertyDeclaration)
					.find(m => m.name.getText(this.sourceFile) === pae.name.text) as ts.PropertyDeclaration;
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

	private getDeclarationFromVariableStatement = (statement: ts.VariableStatement, name: string): IDeclarationOrDefault => {
		// export let name1, name2, …, nameN; // also var, const
		// export let name1 = 1, name2 = 2, 3, nameN; // also var, const
		let varDeclaration: ts.VariableDeclaration;
		varDeclaration = statement.declarationList.declarations.find(x => (x.name as ts.Identifier).text === name);
		if (varDeclaration && statement.modifiers && statement.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
			return { varDeclaration };
		}
	}

	private getDeclarationFromExportDeclarationStatement = (statement: ts.ExportDeclaration, name: string): IDeclarationOrDefault => {
		const exp = statement.exportClause.elements.find(x => (x.name as ts.Identifier).text === name);
		if (exp && exp.propertyName && exp.name.text !== 'default') {
			// export { variable1 as name1, variable2 as name2, nameN };
			return { varDeclaration: this.getVariableDefinition(exp.propertyName) };
		} else if (exp && exp.propertyName && exp.name.text === 'default') {
			// export { name1 as default };
			return { defaultDeclaration: this.getVariableDefinition(exp.propertyName) };
		} else if (exp) {
			// export { name1, name2, …, nameN };
			return { varDeclaration: this.getVariableDefinition(exp.name) };
		}
	}

	private getDeclarationFromExportAssignment = (statement: ts.ExportAssignment, name: string): IDeclarationOrDefault => {
		const exp = statement.expression;
		if (ts.isIdentifier(exp)) {
			// export default identifier;
			if (exp.text === name) {
				return { varDeclaration: this.getVariableDefinition(exp) };
			} else {
				return { defaultDeclaration: this.getVariableDefinition(exp) };
			}
		}
	}

	public getExportedVariable = (name: string): ts.VariableDeclaration => {
		let result: IDeclarationOrDefault;
		let defaultFallback: ts.VariableDeclaration;
		let i = 0;

		while (i < this.sourceFile.statements.length) {
			const statement = this.sourceFile.statements[i];

			if (ts.isVariableStatement(statement)) {
				result = this.getDeclarationFromVariableStatement(statement, name);
			} else if (ts.isExportDeclaration(statement)) {
				result = this.getDeclarationFromExportDeclarationStatement(statement, name);
			} else if (ts.isExportAssignment(statement)) {
				result = this.getDeclarationFromExportAssignment(statement, name);
			}

			if (result && result.varDeclaration) {
				return result.varDeclaration;
			}
			if (result && result.defaultDeclaration) {
				defaultFallback = result.defaultDeclaration;
			}

			// TODO: The following valid ES Module declarations are not supported yet.  They require a full tree traversal.
			// export default function () { } // also class, function*
			// export default function name1() { } // also class, function*
			// export function FunctionName() {}
			// export class ClassName {}
			// export default expression; // where expression is not an identifier

			i++;
		}

		return defaultFallback;
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
