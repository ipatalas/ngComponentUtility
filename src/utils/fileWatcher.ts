import * as vsc from 'vscode';
import { angularRoot } from './vsc';
import { logVerbose } from './logging';

export type CallbackFunc = (uri: vsc.Uri) => void;

export class FileWatcher implements vsc.Disposable {
	private disposables: vsc.Disposable[] = [];

	constructor(globs: string[], onAdded: CallbackFunc, onChanged: CallbackFunc, onDeleted: CallbackFunc) {
		for (const glob of globs) {
			logVerbose(`Setting up watch for ${glob}`);

			const relativeGlob = new vsc.RelativePattern(angularRoot, glob);
			const watcher = vsc.workspace.createFileSystemWatcher(relativeGlob);

			watcher.onDidChange(onChanged, undefined, this.disposables);
			watcher.onDidDelete(onDeleted, undefined, this.disposables);
			watcher.onDidCreate(onAdded, undefined, this.disposables);

			this.disposables.push(watcher);
		}
	}

	public dispose() {
		if (this.disposables.length > 0) {
			this.disposables.forEach(d => d.dispose());
			this.disposables = [];
		}
	}
}
