import * as glob from 'glob';
import * as vsc from 'vscode';
import { Component } from './component'

export class ComponentScanner {

	private options: IOptions = {};
	components: Component[] = [];

	findFiles = () => {
		return new Promise<void>((resolve, reject) => {
			let config = vsc.workspace.getConfiguration("ngIntelliSense");
			let componentGlob = <string>config.get("componentGlob");

			glob(componentGlob, this.options, async (err, matches) => {
				for (var path of matches) {
					this.components.push.apply(this.components, await Component.parse(path));
				}

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
