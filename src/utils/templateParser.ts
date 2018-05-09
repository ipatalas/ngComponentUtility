import * as ts from 'typescript';
import * as path from 'path';
import { TypescriptParser } from './typescriptParser';
import { IComponentTemplate } from './component/component';
import { RelativePath } from './htmlTemplate/relativePath';
import { ConfigParser } from './configParser';

export class TemplateParser {
	public createTemplate = (config: ConfigParser, parser: TypescriptParser) => {
		return this.createTemplateFromUrl(config.get('templateUrl'), parser)
				|| this.createFromInlineTemplate(config.get('template'), parser);
	}

	private createFromInlineTemplate = (node: ts.Expression, parser: TypescriptParser): IComponentTemplate => {
		if (!node) {
			return undefined;
		}

		if (node.kind === ts.SyntaxKind.StringLiteral || node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral) {
			const pos = parser.sourceFile.getLineAndCharacterOfPosition(node.getStart(parser.sourceFile));
			const literal = node as ts.LiteralExpression;

			return { path: parser.path, pos, body: literal.text } as IComponentTemplate;
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
			const templateDeclaration = declarations.find(declaration => declaration.name.getText() === node.getText());
			// pass CallExpression (e.g. require('./template.html'))
			return this.createFromInlineTemplate(templateDeclaration.initializer, parser);
		}
	}

	private createTemplateFromUrl(node: ts.Expression, parser: TypescriptParser) {
		if (!node) {
			return undefined;
		}

		const relativePath = parser.getStringValueFromNode(node);
		if (relativePath) {
			const templatePath = RelativePath.toAbsolute(relativePath);

			return { path: templatePath, pos: { line: 0, character: 0 } } as IComponentTemplate;
		}
	}
}
