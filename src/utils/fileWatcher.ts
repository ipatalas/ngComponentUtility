import * as vsc from 'vscode';
import * as path from 'path';

export type CallbackFunc = (uri: vsc.Uri) => void;

export class FileWatcher implements vsc.Disposable {
	private watcher: vsc.FileSystemWatcher;
	private disposables: vsc.Disposable[] = [];

	constructor(globs: string[], onAdded: CallbackFunc, onChanged: CallbackFunc, onDeleted: CallbackFunc) {
		for (let glob of globs) {
			glob = path.join(vsc.workspace.rootPath, glob);

			this.watcher = vsc.workspace.createFileSystemWatcher(glob);
			this.watcher.onDidChange(onChanged, undefined, this.disposables);
			this.watcher.onDidDelete(onDeleted, undefined, this.disposables);
			this.watcher.onDidCreate(onAdded, undefined, this.disposables);

			this.disposables.push(this.watcher);
		}
	}

	public dispose() {
		if (this.disposables.length > 0) {
			this.disposables.forEach(d => d.dispose());
			this.disposables = [];
		}
	}
}
