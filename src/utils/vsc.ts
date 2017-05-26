import * as path from 'path';
import * as ts from 'typescript';
import * as _ from 'lodash';
import * as vsc from 'vscode';

export const workspaceRoot = vsc.workspace.rootPath;

export function getLocation(location: { path: string, pos: ts.LineAndCharacter }) {
	return new vsc.Location(vsc.Uri.file(location.path), new vsc.Position(location.pos.line, location.pos.character));
}

export class ConfigurationChangeListener {
	private lastConfig: vsc.WorkspaceConfiguration;
	private eventEmitter: vsc.EventEmitter<IConfigurationChangedEvent>;
	private disposable: vsc.Disposable;

	constructor(private section: string) {
		this.lastConfig = vsc.workspace.getConfiguration(section);
		this.eventEmitter = new vsc.EventEmitter<IConfigurationChangedEvent>();

		this.disposable = vsc.Disposable.from(
			this.eventEmitter,
			vsc.workspace.onDidChangeConfiguration(this.onChanged, this)
		);
	}

	private onChanged = () => {
		const current = vsc.workspace.getConfiguration(this.section);

		const changedKeys = _(Object.keys(current))
			.filter(key => !(current[key] instanceof Function))
			.filter(key => !_.isEqual(current[key], this.lastConfig[key]))
			.value();

		this.eventEmitter.fire(Object.freeze({
			config: current,
			changedKeys,
			hasChanged: (...keys: string[]) => keys.some(key => _.includes(changedKeys, key))
		}));

		this.lastConfig = current;
	}

	get onDidChange() {
		return this.eventEmitter.event;
	}

	public dispose = () => {
		this.disposable.dispose();
	}
}

export interface IConfigurationChangedEvent {
	config: vsc.WorkspaceConfiguration;
	changedKeys: string[];

	hasChanged(...keys: string[]): boolean;
}

export function logParsingError(fullpath: string, err: Error) {
	const relativePath = '.' + path.sep + path.relative(workspaceRoot, fullpath);

	// tslint:disable-next-line:no-console
	console.error(`[ngComponents] There was an error analyzing ${relativePath}.
Please report this as a bug and include failing file if possible (remove or change sensitive data).

${err.message}
Stack trace:
${err.stack}`.trim());
}
