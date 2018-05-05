import * as path from 'path';
import { angularRoot } from '../vsc';
import * as vsc from 'vscode';

export class RelativePath {
	private readonly relativePath: string;
	private static readonly reSlashes = /\\/g;

	constructor(fullpath: string) {
		this.relativePath = path.relative(angularRoot, fullpath).replace(RelativePath.reSlashes, '/');
	}

	public static fromUri = (uri: vsc.Uri) => new RelativePath(uri.fsPath);

	public get relative() {
		return this.relativePath;
	}

	public get absolute() {
		return path.join(angularRoot, this.relativePath);
	}
}
