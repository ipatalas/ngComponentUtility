import * as vsc from 'vscode';
import { angularRoot } from './vsc';
import { logVerbose } from './logging';

export type CallbackFunc = (uri: vsc.Uri) => void;

export class FileWatcher implements vsc.Disposable {
	private disposables: vsc.Disposable[] = [];

	private logChange = (uri: vsc.Uri) => logVerbose(`${this.type} change detected at ${uri.fsPath}`);
	private logAdd = (uri: vsc.Uri) => logVerbose(`New ${this.type} detected at ${uri.fsPath}`);
	private logDelete = (uri: vsc.Uri) => logVerbose(`${this.type} deletion detected at ${uri.fsPath}`);

	constructor(private type: string, globs: string[], onAdded: CallbackFunc, onChanged: CallbackFunc, onDeleted: CallbackFunc) {
		for (const glob of globs) {
			logVerbose(`Setting up ${type} watch for ${glob}`);

			const relativeGlob = new vsc.RelativePattern(angularRoot, glob);
			const watcher = vsc.workspace.createFileSystemWatcher(relativeGlob);

			watcher.onDidChange(this.loggedCallback(this.logChange, onChanged), undefined, this.disposables);
			watcher.onDidDelete(this.loggedCallback(this.logDelete, onDeleted), undefined, this.disposables);
			watcher.onDidCreate(this.loggedCallback(this.logAdd, onAdded), undefined, this.disposables);

			this.disposables.push(watcher);
		}
	}

	private loggedCallback = (logger: CallbackFunc, callback: CallbackFunc) => (uri: vsc.Uri) => {
		logger(uri);
		callback(uri);
	}

	public dispose() {
		if (this.disposables.length > 0) {
			this.disposables.forEach(d => d.dispose());
			this.disposables = [];
		}
	}
}
