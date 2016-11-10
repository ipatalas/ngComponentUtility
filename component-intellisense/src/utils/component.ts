import * as fs from 'fs';
import * as vsc from 'vscode';
import * as decamelize from 'decamelize';

export interface IComponentBinding {
	name: string;
	htmlName: string;
	type: string;
}

const REGEX_COMPONENT = /component\(\s*(["'])(\w+)\1\s*,\s*((?:.|\s)*?})\s*\)/g;
const REGEX_BINDINGS = /bindings\s*:\s*({(?:.|\s)*?})/;
const REGEX_KEYS = /(\w+)\s*:/g;
const REGEX_SINGLEQUOTES = /(:\s*)?'([^\']*)'/g;
const REGEX_TRAILINGCOMMAS = /,(\s*})/;
const REGEX_LINECOMMENTS = /\s*\/\/.*/g;

// TODO: use https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
// when things will become more complicated and simple string parsing won't be enough

export class Component {
	public name: string;
	public htmlName: string;
	public bindings: IComponentBinding[] = [];
	public uri: vsc.Uri;

	public static parse(path: string): Promise<Component[]> {
		return new Promise<Component[]>((resolve, reject) => {
			fs.readFile(path, 'utf8', (err, contents) => {
				if (err) {
					return reject(err);
				}

				let match: RegExpExecArray;
				let results: Component[] = [];

				// tslint:disable-next-line:no-conditional-assignment
				while (match = REGEX_COMPONENT.exec(contents)) {
					let bindings;
					let name = match[2];
					let bindingsMatch = match[3].match(REGEX_BINDINGS)
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
					result.htmlName = decamelize(name, '-');
					result.uri = vsc.Uri.file(path);

					if (bindings) {
						Object.keys(bindings).forEach(key => {
							result.bindings.push(Component.createBinding(key, bindings[key]));
						});
					}

					results.push(result);
				}

				resolve(results);
			});
		});
	}

	private static createBinding(key: string, type: string): IComponentBinding {
		let result = <IComponentBinding>{};
		result.name = key;
		result.type = type;
		result.htmlName = decamelize(key, '-');

		return result;
	}
}

