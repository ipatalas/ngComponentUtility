import * as ts from 'typescript';
import { SourceFile } from '../sourceFile';
import { IMember } from './member';
import { ControllerParser } from './controllerParser';
import { logParsingError } from '../logging';

export class Controller {
	public name: string;
	public className: string;
	public path: string;
	public pos: ts.LineAndCharacter;
	public members: IMember[];

	public static parse(file: SourceFile): Promise<Controller[]> {
		return new Promise<Controller[]>((resolve, _reject) => {
			try {
				const parser = new ControllerParser(file);
				const results: Controller[] = parser.parse();

				resolve(results);
			} catch (e) {
				logParsingError(file.path, e);
				resolve([]);
			}
		});
	}
}
