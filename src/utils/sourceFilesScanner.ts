import * as vsc from 'vscode';
import * as _ from 'lodash';
import { SourceFile } from './sourceFile';
import { default as glob } from './glob';
import * as prettyHrtime from 'pretty-hrtime';

// tslint:disable:no-console
export class SourceFilesScanner {
	public findFiles = <SourceFileType>(configKey: string, callbackFn: (src: SourceFile) => Promise<SourceFileType[]>, fileType: string) => {
		return new Promise<SourceFileType[]>(async (resolve, reject) => {
			let total = process.hrtime();
			let config = vsc.workspace.getConfiguration("ngComponents");
			let globs = <string[]>config.get(configKey);

			try {
				let globTime = process.hrtime();
				let files = _.flatten(await Promise.all(globs.map(pattern => glob(pattern, { absolute: true }))));
				globTime = process.hrtime(globTime);

				let parse = process.hrtime();
				let sourceFiles = await Promise.all(files.map(SourceFile.parse));
				parse = process.hrtime(parse);

				let analyze = process.hrtime();
				let components = await Promise.all(sourceFiles.map(callbackFn));
				let result = _.flatten(components);
				analyze = process.hrtime(analyze);

				total = process.hrtime(total);

				// tslint:disable-next-line:max-line-length
				console.log(`[ngComponents] ${fileType} stats [files=${files.length}, glob=${prettyHrtime(globTime)}, parse=${prettyHrtime(parse)}, analyze=${prettyHrtime(analyze)}, total=${prettyHrtime(total)}]`);

				resolve(result);
			} catch (e) {
				reject(e);
			}
		});
	}
}
