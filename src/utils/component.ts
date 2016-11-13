import * as fs from 'fs';
import * as path from 'path';
import * as ts from "typescript";
import * as decamelize from 'decamelize';

export interface IComponentBinding {
	name: string;
	htmlName: string;
	type: string;
}

export enum ParseMode {
	Regex,
	AST
}

const REGEX_COMPONENT = /component\(\s*(["'])(\w+)\1\s*,\s*((?:.|\s)*?})\s*\)/g;
const REGEX_BINDINGS = /bindings\s*:\s*({(?:.|\s)*?})/;
const REGEX_KEYS = /(\w+)\s*:/g;
const REGEX_SINGLEQUOTES = /(:\s*)?'([^\']*)'/g;
const REGEX_TRAILINGCOMMAS = /,(\s*})/;
const REGEX_LINECOMMENTS = /\s*\/\/.*/g;

export class Component {
	public name: string;
	public htmlName: string;
	public bindings: IComponentBinding[] = [];
	public path: string;
	public offset: ts.LineAndCharacter;

	public static parse(filepath: string, mode: ParseMode = ParseMode.Regex): Promise<Component[]> {
		return new Promise<Component[]>((resolve, reject) => {
			fs.readFile(filepath, 'utf8', (err, contents) => {
				if (err) {
					return reject(err);
				}

				let parse = mode === ParseMode.Regex ? Component.parseWithRegex : Component.parseWithApi;

				try {
					let results: Component[] = parse(contents).map(c => {
						c.path = filepath;
						c.htmlName = decamelize(c.name, '-');
						return c;
					});

					resolve(results);
				} catch (e) {
					// tslint:disable-next-line:no-console
					console.log(`
There was an error processing ${path.basename(filepath)}.
Please report this as a bug and include failing component if possible (remove or change sensitive data).`.trim());
					resolve([]);
				}
			});
		});
	}

	private static parseWithApi(contents: string) {
		let sourceFile = ts.createSourceFile('foo.ts', contents, ts.ScriptTarget.ES5, true);
		let results: Component[] = [];
		visitAllChildren(sourceFile);

		return results;

		function visitAllChildren(node: ts.Node) {
			if (node.kind === ts.SyntaxKind.CallExpression) {
				let call = <ts.CallExpression>node;

				if ((call.expression as ts.PropertyAccessExpression).name.text === 'component' && call.arguments.length === 2) {
					let componentName = <ts.StringLiteral>call.arguments[0];
					let componentConfigObj = <ts.ObjectLiteralExpression>call.arguments[1];

					let result = new Component();
					result.name = componentName.text;
					result.offset = sourceFile.getLineAndCharacterOfPosition(componentName.pos);

					let bindingsObj = <ts.PropertyAssignment>componentConfigObj.properties.find(v => v.name.getText() === 'bindings');
					if (bindingsObj) {
						let bindingsProps = <ts.ObjectLiteralExpression>bindingsObj.initializer;
						bindingsProps.properties.forEach((v: ts.PropertyAssignment) => {
							result.bindings.push(Component.createBinding(v.name.getText(), (<ts.StringLiteral>v.initializer).text));
						});
					}

					results.push(result);
				}
			} else {
				node.getChildren().forEach(c => visitAllChildren(c));
			}
		}
	}

	private static parseWithRegex(contents: string) {
		let match: RegExpExecArray;
		let results: Component[] = [];

		// tslint:disable-next-line:no-conditional-assignment
		while (match = REGEX_COMPONENT.exec(contents)) {
			let bindings;
			let name = match[2];
			let bindingsMatch = match[3].match(REGEX_BINDINGS);
			if (bindingsMatch) {
				let bindingsJson = bindingsMatch[1]
					.replace(REGEX_KEYS, '"$1":') // surround keys with quotes
					.replace(REGEX_SINGLEQUOTES, (_m, p1, p2) => {
						let prefix = p1 || '';
						let quotes = '"' + p2.replace(/"/g, '\\"') + '"';
						return prefix + quotes;
					}) // replace single quotes for values
					.replace(REGEX_TRAILINGCOMMAS, "$1") // fix trailing commas
					.replace(REGEX_LINECOMMENTS, ""); // remove line comments

				bindings = JSON.parse(bindingsJson);
			}

			let result = new Component();
			result.name = name;

			if (bindings) {
				Object.keys(bindings).forEach(key => {
					result.bindings.push(Component.createBinding(key, bindings[key]));
				});
			}

			results.push(result);
		}

		return results;
	}

	private static createBinding(key: string, type: string): IComponentBinding {
		let result = <IComponentBinding>{};
		result.name = key;
		result.type = type;
		result.htmlName = decamelize(key, '-');

		return result;
	}
}
