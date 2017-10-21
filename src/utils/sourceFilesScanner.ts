import * as vsc from 'vscode';
import * as _ from 'lodash';
import { SourceFile } from './sourceFile';
import * as prettyHrtime from 'pretty-hrtime';
import { log } from './logging';
import { findFiles } from './vsc';

// tslint:disable:no-console
export class SourceFilesScanner {
	public findFiles = <SourceFileType>(configKey: string, callbackFn: (src: SourceFile) => Promise<SourceFileType[]>, fileType: string) => {
		return new Promise<SourceFileType[]>(async (resolve, reject) => {
			let total = process.hrtime();
			const config = vsc.workspace.getConfiguration('ngComponents');
			const globs = config.get(configKey) as string[];

			try {
				let globTime = process.hrtime();
				const files = _.flatten(await Promise.all(globs.map(g => findFiles(g))));
				globTime = process.hrtime(globTime);

				let parse = process.hrtime();
				const sourceFiles = await Promise.all(files.map(SourceFile.parse));
				parse = process.hrtime(parse);

				let analyze = process.hrtime();
				const components = await Promise.all(sourceFiles.map(callbackFn));
				const result = _.flatten(components);
				analyze = process.hrtime(analyze);

				total = process.hrtime(total);

				// tslint:disable-next-line:max-line-length
				log(`${fileType} stats [files=${files.length}, glob=${prettyHrtime(globTime)}, parse=${prettyHrtime(parse)}, analyze=${prettyHrtime(analyze)}, total=${prettyHrtime(total)}]`);

				resolve(result);
			} catch (e) {
				reject(e);
			}
		});
	}
}
