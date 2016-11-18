import * as fs from 'fs';
import * as path from 'path';
import * as ts from "typescript";

export class SourceFile {
	public path: string;
	public sourceFile: ts.SourceFile;

	public static parse(filepath: string): Promise<SourceFile> {
		return new Promise<SourceFile>((resolve, reject) => {
			fs.readFile(filepath, 'utf8', (err, contents) => {
				if (err) {
					return reject(err);
				}

				try {
					let sourceFile = ts.createSourceFile(path.basename(filepath), contents, ts.ScriptTarget.ES5, true);
					resolve(<SourceFile>{
						path: filepath,
						sourceFile: sourceFile
					});
				} catch (e) {
					// tslint:disable-next-line:no-console
					console.log(`
There was an error parsing ${path.basename(filepath)} with Compiler API.
Please report this as a bug and include failing component if possible (remove or change sensitive data).`.trim());
					resolve(null);
				}
			});
		});
	}
}