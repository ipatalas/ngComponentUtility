import * as _ from 'lodash';
import * as vsc from 'vscode';
import * as ts from 'typescript';
import * as fs from 'fs';
import { getLocation } from '../utils/vsc';
import { IComponentBase } from '../utils/component/component';
import { SourceFile } from '../utils/sourceFile';
import { TypescriptParser } from '../utils/typescriptParser';

export class MemberReferencesProvider implements vsc.ReferenceProvider {

	private components: IComponentBase[];

	public load = (components: IComponentBase[]) => {
		this.components = components;
	}

	// tslint:disable-next-line:max-line-length
	public async provideReferences(document: vsc.TextDocument, position: vsc.Position, _context: vsc.ReferenceContext, _token: vsc.CancellationToken): Promise<vsc.Location[]> {
		const src = await SourceFile.parse(document.fileName);
		const index = src.sourceFile.getPositionOfLineAndCharacter(position.line, position.character);

		const tsParser = new TypescriptParser(src);
		const node = tsParser.findNode(index);

		if (node && ts.isIdentifier(node)) {
			if (ts.isPropertyDeclaration(node.parent) || ts.isMethodDeclaration(node.parent)) {
				const classDeclaration = tsParser.closestParent<ts.ClassDeclaration>(node, ts.SyntaxKind.ClassDeclaration);
				if (classDeclaration) {
					const components = this.components
						.filter(c => c.controller && c.controller.isInstanceOf(classDeclaration.name.text));

					return Promise
						.all(components.map(c => this.getLocations(c, node)))
						.then(x => _.flatten(x));
				}
			}
		}

		return Promise.resolve([]);
	}

	private getLocations = async (component: IComponentBase, identifier: ts.Identifier): Promise<vsc.Location[]> => {
		const searchString = `${component.controllerAs}.${identifier.text}`;
		const template = component.template;

		return new Promise<vsc.Location[]>((resolve, reject) => {
			if (template.body) {
				const result = getSearchStringLocations(template.body)
					.map(pos => getLocation({
						path: component.path,
						pos: {
							line: pos.line + template.pos.line,
							character: pos.character + template.pos.character
						}
					}));

				resolve(result);
				return;
			}

			fs.readFile(template.path, 'utf8', (err, contents) => {
				if (err) {
					return reject(err);
				}

				const result = getSearchStringLocations(contents)
					.map(pos => getLocation({ path: template.path, pos }));

				resolve(result);
			});
		});

		function getSearchStringLocations(contents: string) {
			const lines = contents.split(/\r?\n/);

			return lines.reduce((prev: ts.LineAndCharacter[], line, lineNr) => {
				let start = 0;
				let result;

				// tslint:disable-next-line:no-conditional-assignment
				while ((result = line.indexOf(searchString, start)) > -1) {
					prev.push({ line: lineNr, character: result });
					start = result + 1;
				}

				return prev;
			}, []);
		}
	}
}
