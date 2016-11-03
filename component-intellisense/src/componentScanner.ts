import * as glob from 'glob';
import * as vsc from 'vscode';
import * as _ from 'lodash';
import { Component } from './component'

const PERF_TOTAL = "Total time consumed on scanning for components";
const PERF_PARSEONLY = "Time consumed on parsing component files";

export class ComponentScanner {

	private options: IOptions = {};
	components: Component[] = [];

	findFiles = () => {
		return new Promise<void>((resolve, reject) => {
			console.time(PERF_TOTAL);
			let config = vsc.workspace.getConfiguration("ngIntelliSense");
			let componentGlob = <string>config.get("componentGlob");

			glob(componentGlob, this.options, async (err, matches) => {
				console.time(PERF_PARSEONLY);

				let result = await Promise.all(matches.map(Component.parse));
				this.components = _.flatten(result);

				console.timeEnd(PERF_PARSEONLY);
				console.timeEnd(PERF_TOTAL);

				resolve();
			});
		});
	}

	init = (cwd: string) => {
		this.options.cwd = cwd;
		this.options.absolute = true;
	}
}

// @types/glob does not have 'absolute' field available yet
interface IOptions extends glob.IOptions {
	absolute?: boolean;
}
