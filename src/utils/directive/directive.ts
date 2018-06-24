import * as ts from 'typescript';
import { DirectiveParser } from './directiveParser';
import { SourceFile } from '../sourceFile';
import { logParsingError } from '../logging';

export const DEFAULT_RESTRICT = 'EA';

export class Directive {
	public restrict: string;
	public name: string;
	public htmlName: string;
	public className: string;
	public path: string;
	public pos: ts.LineAndCharacter;

	public static parse(file: SourceFile): Promise<Directive[]> {
		return new Promise<Directive[]>(async (resolve, _reject) => {
			try {
				const parser = new DirectiveParser(file);
				const results: Directive[] = await parser.parse();

				resolve(results);
			} catch (e) {
				logParsingError(file.path, e);
				resolve([]);
			}
		});
	}
}
