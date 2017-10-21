import * as ts from 'typescript';
import * as vsc from 'vscode';
import * as path from 'path';
import { isValidAngularProject } from './angular';
import { logVerbose, log } from './logging';

export const workspaceRoot = vsc.workspace.workspaceFolders[0].uri.fsPath;

export function getLocation(location: { path: string, pos: ts.LineAndCharacter }) {
	return new vsc.Location(vsc.Uri.file(location.path), new vsc.Position(location.pos.line, location.pos.character));
}

export function shouldActivateExtension() {
	const config = vsc.workspace.getConfiguration('ngComponents');
	const forceEnable = config.get('forceEnable');

	if (forceEnable) {
		logVerbose('forceEnable is true for this workspace, skipping auto-detection');
	} else {
		logVerbose('Detecting Angular in workspace');
		const result = workspaceRoot && isValidAngularProject(workspaceRoot);

		if (!result) {
			log('Angular was not detected in the project');
			return false;
		}

		logVerbose('Angular detected, initializing extension.');
	}

	return true;
}

export function alreadyAngularProject() {
	vsc.window.showInformationMessage('This project is already an AngularJS project.');
}

export function notAngularProject() {
	const msg = 'Force enable';
	vsc.window.showInformationMessage('AngularJS has not been detected in this project', msg).then(v => {
		if (v === msg) {
			markAngularProject();
		}
	});
}

export function markAngularProject() {
	const config = vsc.workspace.getConfiguration('ngComponents');
	config.update('forceEnable', true, false).then(_ => {
		vsc.commands.executeCommand('workbench.action.reloadWindow');
	});
}

export function findFiles(pattern: string, relative?: boolean) {
	const workspacePattern = new vsc.RelativePattern(vsc.workspace.workspaceFolders[0], pattern);

	return vsc.workspace.findFiles(workspacePattern).then(matches => matches.map(m => {
		if (relative) {
			return path.relative(workspaceRoot, m.fsPath);
		} else {
			return m.fsPath;
		}
	}));
}
