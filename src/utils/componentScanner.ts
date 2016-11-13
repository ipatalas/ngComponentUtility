import * as glob from 'glob';
import * as vsc from 'vscode';
import * as _ from 'lodash';
import { Component } from './component';

const PERF_TOTAL = "Total time consumed on scanning for components";
const PERF_PARSEONLY = "Time consumed on parsing component files";

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
				let files = _.flatten(await Promise.all(componentGlobs.map(pattern => this.glob(pattern))));

				console.time(PERF_PARSEONLY);

				let result = await Promise.all(files.map(m => Component.parse(m)));
				this.components = _.flatten(result);

				console.timeEnd(PERF_PARSEONLY);
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
