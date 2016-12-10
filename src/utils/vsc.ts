import * as util from 'util';
import * as vsc from 'vscode';
import * as ts from 'typescript';
import * as _ from 'lodash';

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
	return (message, ...args) => {
		channel.appendLine(util.format(message, ...args));
		originalHandler.apply(console, arguments);
	};
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
