import * as vsc from 'vscode';
import * as path from 'path';

export type CallbackFunc = (uri: vsc.Uri) => void;

export class FileWatcher implements vsc.Disposable {
	private disposables: vsc.Disposable[] = [];

	constructor(globs: string[], onAdded: CallbackFunc, onChanged: CallbackFunc, onDeleted: CallbackFunc) {
		for (const glob of globs) {
			const watcher = vsc.workspace.createFileSystemWatcher(glob);
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
