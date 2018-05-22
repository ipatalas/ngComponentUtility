import * as ts from 'typescript';
import * as vsc from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { isValidAngularProject } from './angular';
import { logVerbose, log, logWarning, logError } from './logging';

const workspaceRoot = vsc.workspace.workspaceFolders && vsc.workspace.workspaceFolders[0].uri.fsPath;

export let angularRoot;

export function mockRoot(rootPath: string) {
	if (process.env.NODE_ENV === 'test') {
		const oldRoot = angularRoot;
		angularRoot = rootPath;
		return oldRoot;
	} else {
		logError('This is only allowed in tests');
	}
}

export function getLocation(location: { path: string, pos: ts.LineAndCharacter }) {
	return new vsc.Location(vsc.Uri.file(location.path), new vsc.Position(location.pos.line, location.pos.character));
}

export function getConfiguration() {
	return vsc.workspace.getConfiguration('ngComponents');
}

export function shouldActivateExtension() {
	const config = getConfiguration();
	const forceEnable = config.get<boolean>('forceEnable');
	angularRoot = getAngularRootDirectory();

	if (forceEnable) {
		logVerbose('forceEnable is true for this workspace, skipping auto-detection');
	} else {
		logVerbose('Detecting Angular in workspace');
		const result =
			angularRoot && isValidAngularProject(angularRoot) ||
			workspaceRoot && isValidAngularProject(workspaceRoot);

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
			markAsAngularProject();
		}
	});
}

export function markAsAngularProject() {
	const config = getConfiguration();
	config.update('forceEnable', true, false).then(_ => {
		vsc.commands.executeCommand('workbench.action.reloadWindow');
	});
}

export function findFiles(pattern: string) {
	const workspacePattern = new vsc.RelativePattern(angularRoot, pattern);

	return vsc.workspace.findFiles(workspacePattern).then(matches => matches.map(m => m.fsPath));
}

function getAngularRootDirectory() {
	const config = getConfiguration();
	let value = config.get<string>('angularRoot');

	if (value) {
		value = path.join(workspaceRoot, value);
		if (fs.existsSync(value)) {
			return value;
		}

		logWarning(`${value} does not exist. Please correct angularRoot setting value`);
	}

	if (process.env.NODE_ENV === 'test') {
		return '';
	}

	return workspaceRoot;
}
