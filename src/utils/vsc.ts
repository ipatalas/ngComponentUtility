import * as vsc from 'vscode';
import * as ts from 'typescript';

export const workspaceRoot = vsc.workspace.rootPath;

export function getLocation(location: {path: string, pos: ts.LineAndCharacter}) {
	return new vsc.Location(vsc.Uri.file(location.path), new vsc.Position(location.pos.line, location.pos.character));
}
