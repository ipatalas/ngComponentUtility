import * as ts from 'typescript';
import { SourceFile } from '../sourceFile';
import { Controller } from '../controller/controller';
import { ComponentParser } from './componentParser';
import { logParsingError } from '../logging';
import * as vsc from 'vscode';
import { ControllerHelper } from '../controllerHelper';

export class Component implements IComponentBase {
	public name: string;
	public htmlName: string;
	public bindings: IComponentBinding[] = [];
	public path: string;
	public pos: ts.LineAndCharacter;

	public template: IComponentTemplate;
	public controller: Controller;
	public controllerAs: string;
	public controllerName: string;
	public controllerClassName: string;

	public getBindings = () => this.bindings;

	public static parse(file: SourceFile, controllers: Controller[]): Promise<Component[]> {
		return new Promise<Component[]>(async (resolve, _reject) => {
			try {
				const controllerHelper = new ControllerHelper(controllers);
				const parser = new ComponentParser(file, controllerHelper);
				const results: Component[] = await parser.parse();

				resolve(results);
			} catch (e) {
				logParsingError(file.path, e);
				resolve([]);
			}
		});
	}
}

export interface IComponentBase {
	path: string;

	template: IComponentTemplate;

	controller: Controller;
	controllerAs: string;
	controllerName: string;
	controllerClassName: string;

	getBindings(): IComponentBinding[];
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

	buildCompletionItem(): vsc.CompletionItem;
}
