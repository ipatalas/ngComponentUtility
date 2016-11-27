import * as util from 'util';
import * as vsc from 'vscode';
import * as ts from 'typescript';

export const workspaceRoot = vsc.workspace.rootPath;

export function getLocation(location: { path: string, pos: ts.LineAndCharacter }) {
	return new vsc.Location(vsc.Uri.file(location.path), new vsc.Position(location.pos.line, location.pos.character));
}

const originalConsoleLog = console.log;
const originalConsoleErr = console.error;
const originalConsoleWarn = console.warn;

export function overrideConsole(channel: vsc.OutputChannel) {
	console.log = getConsoleHandler(channel, originalConsoleLog);
	console.error = getConsoleHandler(channel, originalConsoleErr);
	console.warn = getConsoleHandler(channel, originalConsoleWarn);
}

export function revertConsole() {
	console.log = originalConsoleLog;
	console.error = originalConsoleErr;
	console.warn = originalConsoleWarn;
}

function getConsoleHandler(channel: vsc.OutputChannel, originalHandler: (message?: any, ...optionalParams: any[]) => void) {
	return function (message, ...args) {
		channel.appendLine(util.format(message, ...args));
		originalHandler.apply(console, arguments);
	};
}