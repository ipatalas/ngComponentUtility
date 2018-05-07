import * as ts from 'typescript';
import { SourceFile } from '../sourceFile';
import { IComponentTemplate, IComponentWithController } from '../component/component';
import { logParsingError } from '../logging';
import { RouteParser } from './routeParser';
import { Controller } from '../controller/controller';
import { ControllerHelper } from '../controllerHelper';

export class Route implements IComponentWithController {
	public name: string;
	public template: IComponentTemplate;
	public path: string;
	public pos: ts.LineAndCharacter;

	public controller: Controller;
	public controllerAs: string;
	public controllerName: string;
	public controllerClassName: string;

	public static parse(file: SourceFile, controllers: Controller[]): Promise<Route[]> {
		return new Promise<Route[]>((resolve, _reject) => {
			try {
				const controllerHelper = new ControllerHelper(controllers);
				const parser = new RouteParser(controllerHelper, file);
				const results: Route[] = parser.parse();

				resolve(results);
			} catch (e) {
				logParsingError(file.path, e);
				resolve([]);
			}
		});
	}
}
