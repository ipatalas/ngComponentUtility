import * as ts from "typescript";
import * as decamelize from 'decamelize';
import { SourceFile } from '../sourceFile';
import { Controller } from '../controller/controller';
import { ComponentParser } from "./componentParser";

export class Component {
	public name: string;
	public htmlName: string;
	public bindings: IComponentBinding[] = [];
	public path: string;
	public pos: ts.LineAndCharacter;
	public template: IComponentTemplate;
	public controller: Controller;
	public controllerAs: string;

	public static parse(file: SourceFile, controllers: Controller[]): Promise<Component[]> {
		return new Promise<Component[]>(async (resolve, _reject) => {
			try {
				const results: Component[] = await Component.parseWithApi(file, controllers);

				resolve(results);
			} catch (e) {
				// tslint:disable-next-line:no-console
				console.log(`
There was an error analyzing ${file.sourceFile.fileName}.
Please report this as a bug and include failing component if possible (remove or change sensitive data).

${e}`.trim());
				resolve([]);
			}
		});
	}

	private static async parseWithApi(file: SourceFile, controllers: Controller[]) {
		const parser = new ComponentParser(file, controllers);

		return await parser.parse();
	}
}

export interface IComponentTemplate {
	path: string;
	pos: ts.LineAndCharacter;
	body?: string; // used only for inline templates
}

export interface IComponentBinding {
	name: string;
	htmlName: string;
	type: string;
	pos: ts.LineAndCharacter;
}
