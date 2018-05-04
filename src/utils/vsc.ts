import * as ts from 'typescript';
import * as vsc from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { isValidAngularProject } from './angular';
import { logVerbose, log, logWarning } from './logging';

const workspaceRoot = vsc.workspace.workspaceFolders && vsc.workspace.workspaceFolders[0].uri.fsPath;

export let angularRoot = process.env.ANGULAR_ROOT_MOCK;

export function getLocation(location: { path: string, pos: ts.LineAndCharacter }) {
	return new vsc.Location(vsc.Uri.file(location.path), new vsc.Position(location.pos.line, location.pos.character));
}

export function shouldActivateExtension() {
	const config = vsc.workspace.getConfiguration('ngComponents');
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
	const config = vsc.workspace.getConfiguration('ngComponents');
	config.update('forceEnable', true, false).then(_ => {
		vsc.commands.executeCommand('workbench.action.reloadWindow');
	});
}

export function findFiles(pattern: string, relative?: boolean) {
	const workspacePattern = new vsc.RelativePattern(angularRoot, pattern);

	return vsc.workspace.findFiles(workspacePattern).then(matches => matches.map(m => {
		if (relative) {
			return path.relative(angularRoot, m.fsPath);
		} else {
			return m.fsPath;
		}
	}));
}

function getAngularRootDirectory() {
	const config = vsc.workspace.getConfiguration('ngComponents');
	let value = config.get<string>('angularRoot');

	if (value) {
		value = path.join(workspaceRoot, value);
		if (fs.existsSync(value)) {
			return value;
		}

		logWarning(`${value} does not exist. Please correct angularRoot setting value`);
	}

	return workspaceRoot;
}
