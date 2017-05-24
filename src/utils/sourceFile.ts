import * as fs from 'fs';
import * as path from 'path';
import * as ts from "typescript";
import { logParsingError } from './vsc';

export class SourceFile {
	public get path(): string {
		return this.sourceFile.fullpath;
	}

	constructor(public sourceFile: ISourceFile) {}

	public static parse(filepath: string): Promise<SourceFile> {
		return new Promise<SourceFile>((resolve, reject) => {
			fs.readFile(filepath, 'utf8', (err, contents) => {
				if (err) {
					return reject(err);
				}

				try {
					const sourceFile = ts.createSourceFile(path.basename(filepath), contents, ts.ScriptTarget.ES5, true) as ISourceFile;
					sourceFile.fullpath = filepath;

					resolve(new SourceFile(sourceFile));
				} catch (e) {
					logParsingError(filepath, e);
					resolve(null);
				}
			});
		});
	}
}

export interface ISourceFile extends ts.SourceFile {
	fullpath?: string;
}
