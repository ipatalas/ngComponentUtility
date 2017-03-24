import * as ts from "typescript";
import { SourceFile } from '../sourceFile';
import { IMember } from './member';
import { ControllerParser } from "./controllerParser";

export class Controller {
	public name: string;
	public className: string;
	public path: string;
	public pos: ts.LineAndCharacter;
	public members: IMember[];

	public static parse(file: SourceFile): Promise<Controller[]> {
		return new Promise<Controller[]>((resolve, _reject) => {
			try {
				let results: Controller[] = Controller.parseWithApi(file).map(c => {
					c.path = file.path;
					return c;
				});

				resolve(results);
			} catch (e) {
				// tslint:disable-next-line:no-console
				console.log(`
There was an error analyzing ${file.sourceFile.fileName}.
Please report this as a bug and include failing controller if possible (remove or change sensitive data).`.trim());
				resolve([]);
			}
		});
	}

	private static parseWithApi(file: SourceFile) {
		let parser = new ControllerParser(file);

		return parser.parse();
	}
}
