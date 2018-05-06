import * as ts from 'typescript';
import { SourceFile } from '../sourceFile';
import { IComponentTemplate } from '../component/component';
import { logParsingError } from '../logging';
import { RouteParser } from './routeParser';

export class Route {
	public name: string;
	public template: IComponentTemplate;
	public path: string;
	public pos: ts.LineAndCharacter;

	public static parse(file: SourceFile): Promise<Route[]> {
		return new Promise<Route[]>((resolve, _reject) => {
			try {
				const parser = new RouteParser(file);
				const results: Route[] = parser.parse();

				resolve(results);
			} catch (e) {
				logParsingError(file.path, e);
				resolve([]);
			}
		});
	}
}
