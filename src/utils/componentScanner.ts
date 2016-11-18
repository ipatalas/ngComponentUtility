import * as glob from 'glob';
import * as vsc from 'vscode';
import * as _ from 'lodash';
import { Component } from './component';
import { SourceFile } from './sourceFile';

const PERF_TOTAL = "Total time consumed on scanning for components";
const PERF_GLOB = "Time consumed on finding component files";
const PERF_PARSE = "Time consumed on parsing component files";
const PERF_ANALYZE = "Time consumed on analyzing component files";

// tslint:disable:no-console
export class ComponentScanner {
	private options: IOptions = {};
	public components: Component[] = [];

	public findFiles = () => {
		return new Promise<void>(async (resolve, reject) => {
			console.time(PERF_TOTAL);
			let config = vsc.workspace.getConfiguration("ngComponents");
			let componentGlobs = <string[]>config.get("componentGlobs");

			try {
				console.time(PERF_GLOB);
				let files = _.flatten(await Promise.all(componentGlobs.map(pattern => this.glob(pattern))));
				console.timeEnd(PERF_GLOB);

				console.time(PERF_PARSE);
				let sourceFiles = await Promise.all(files.map(SourceFile.parse));
				console.timeEnd(PERF_PARSE);

				console.time(PERF_ANALYZE);
				let components = await Promise.all(sourceFiles.map(Component.parse));
				this.components = _.flatten(components);
				console.timeEnd(PERF_ANALYZE);

				console.timeEnd(PERF_TOTAL);

				resolve();
			} catch (e) {
				reject(e);
			}
		});
	}

	private glob = (pattern: string) => {
		return new Promise<string[]>((resolve, reject) => {
			glob(pattern, this.options, (err, matches) => {
				if (err) {
					return reject(err);
				}

				resolve(matches);
			});
		});
	}

	public init = (cwd: string) => {
		this.options.cwd = cwd;
		this.options.absolute = true;
	}
}

// @types/glob does not have 'absolute' field available yet
interface IOptions extends glob.IOptions {
	absolute?: boolean;
}
