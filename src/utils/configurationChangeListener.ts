import * as vsc from 'vscode';

export class ConfigurationChangeListener {
	private disposables: vsc.Disposable[] = [];

	constructor(private section: string) {
	}

	public registerListener = (keys: string[] | string, callback: () => void) => {
		if (!Array.isArray(keys)) {
			keys = [keys];
		}

		const configKeys = keys;

		vsc.workspace.onDidChangeConfiguration((event: vsc.ConfigurationChangeEvent) => {
			if (configKeys.some(key => event.affectsConfiguration(`${this.section}.${key}`))) {
				callback();
			}
		}, undefined, this.disposables);
	}

	public dispose = () => {
		this.disposables.forEach(d => d.dispose());
	}
}
