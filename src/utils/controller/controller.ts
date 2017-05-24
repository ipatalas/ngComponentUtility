import * as ts from "typescript";
import { SourceFile } from '../sourceFile';
import { IMember } from './member';
import { ControllerParser } from "./controllerParser";
import { logParsingError } from '../vsc';

export class Controller {
	public name: string;
	public className: string;
	public path: string;
	public pos: ts.LineAndCharacter;
	public members: IMember[];

	public static parse(file: SourceFile): Promise<Controller[]> {
		return new Promise<Controller[]>((resolve, _reject) => {
			try {
				const results: Controller[] = Controller.parseWithApi(file);

				resolve(results);
			} catch (e) {
				logParsingError(file.path, e);
				resolve([]);
			}
		});
	}

	private static parseWithApi(file: SourceFile) {
		const parser = new ControllerParser(file);

		return parser.parse();
	}
}
