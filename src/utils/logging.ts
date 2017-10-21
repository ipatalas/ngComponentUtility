import * as vsc from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { workspaceRoot } from './vsc';

export function logParsingError(fullpath: string, err: Error) {
	const relativePath = '.' + path.sep + path.relative(workspaceRoot || '', fullpath);

	// tslint:disable-next-line:no-console
	console.error(`[ngComponents] There was an error analyzing ${relativePath}.
Please report this as a bug and include failing file if possible (remove or change sensitive data).

${err.message}
Stack trace:
${err.stack}`.trim());
}

let lastError = false;

export function log(text: string) {
	const logPath = redirectToFile();
	if (logPath) {
		fs.appendFile(logPath, text + os.EOL, err => {
			if (err) {
				if (!lastError) {
					// tslint:disable-next-line:no-console
					console.error('Error while logging to file: ' + err);
					lastError = true;
				}
			} else {
				lastError = false;
			}
		});
	} else {
		// tslint:disable-next-line:no-console
		console.log(`[ngComponents] ${text}`);
	}
}

export function logVerbose(text: string) {
	if (isVerboseLogging()) {
		log(text);
	}
}

function isVerboseLogging() {
	const config = vsc.workspace.getConfiguration('ngComponents.logging');
	return config.get('verbose', false) as boolean;
}

function redirectToFile() {
	const config = vsc.workspace.getConfiguration('ngComponents.logging');
	return config.get('redirectToFile') as string;
}
