import * as path from 'path';
import { angularRoot } from '../vsc';
import * as vsc from 'vscode';

export class RelativePath {
	private readonly relativePath: string;
	private static readonly reSlashes = /\\/g;

	constructor(filepath: string, isRelative?: boolean) {
		if (isRelative) {
			this.relativePath = filepath;
		} else {
			this.relativePath = path.relative(angularRoot, filepath).replace(RelativePath.reSlashes, '/');
		}
	}

	public static fromUri = (uri: vsc.Uri) => new RelativePath(uri.fsPath);
	public static toAbsolute = (relative: string) => new RelativePath(relative, true).absolute;

	public get relative() {
		return this.relativePath;
	}

	public get absolute() {
		return path.join(angularRoot, this.relativePath);
	}
}
