import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { logParsingError } from './logging';

export class SourceFile {
	public get path(): string {
		return this.sourceFile.fullpath;
	}

	constructor(public sourceFile: ISourceFile) { }

	public static parseFromString(contents: string, filepath: string): SourceFile {
		const sourceFile = ts.createSourceFile(path.basename(filepath), contents, ts.ScriptTarget.ES5, true) as ISourceFile;
		sourceFile.fullpath = filepath;

		return new SourceFile(sourceFile);
	}

	public static parse(filepath: string): Promise<SourceFile> {
		return new Promise<SourceFile>((resolve, reject) => {
			fs.readFile(filepath, 'utf8', (err, contents) => {
				if (err) {
					return reject(err);
				}

				try {
					resolve(SourceFile.parseFromString(contents, filepath));
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
