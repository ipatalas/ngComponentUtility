import * as path from 'path';
import * as fs from 'fs';
import * as vsc from 'vscode';
import { logError, logWarning } from './utils/logging';
import { EventEmitter } from 'events';
import { events } from './symbols';

const CreateEmptyConfig = (): IConfiguration => ({
	ignoredMemberDiagnostics: {}
});

export class ConfigurationFile extends EventEmitter implements vsc.Disposable {
	private disposable: vsc.Disposable;
	private configurationPath: string;
	private configuration = CreateEmptyConfig();
	private isSaving: boolean = false;

	constructor() {
		super();

		if (!vsc.workspace.workspaceFolders) {
			return;
		}

		this.configurationPath = path.join(vsc.workspace.workspaceFolders[0].uri.fsPath, '.vscode/ngComponents.json');
		const watcher = vsc.workspace.createFileSystemWatcher(this.configurationPath);
		const disposables: vsc.Disposable[] = [];

		watcher.onDidChange(() => this.loadAndEmit(), undefined, disposables);
		watcher.onDidCreate(() => this.loadAndEmit(), undefined, disposables);
		watcher.onDidDelete(() => this.loadAndEmit(), undefined, disposables);

		this.disposable = vsc.Disposable.from(...disposables, watcher);
	}

	public dispose() {
		this.disposable.dispose();
		this.removeAllListeners();
	}

	private loadAndEmit = async () => {
		if (this.isSaving) {
			return;
		}

		try {
			await this.load();
		} catch (err) {
			logWarning('Error while opening configuration file: ' + err.message);
		}

		this.emit(events.configurationFile.ignoredMemberDiagnosticChanged);
	}

	public load = (): Promise<void> => {
		return new Promise<void>((resolve, reject) => {
			fs.readFile(this.configurationPath, { encoding: 'utf8' }, (err, data) => {
				if (err) {
					this.configuration = CreateEmptyConfig();
					return reject(err);
				}

				try {
					this.configuration = JSON.parse(data);
					resolve();
				} catch (err) {
					this.configuration = CreateEmptyConfig();
					reject(err);
				}
			});
		});
	}

	private saveConfiguration = () => {
		const contents = JSON.stringify(this.configuration, undefined, '  ');

		this.isSaving = true;
		fs.writeFile(this.configurationPath, contents, { encoding: 'utf8' }, err => {
			if (err) logError(err, 'Error while writing configuration file: ');

			setTimeout(() => this.isSaving = false, 100);
		});
	}

	public getIgnoredMemberDiagnostics = () => this.configuration.ignoredMemberDiagnostics;
	public addIgnoredMemberDiagnostic = (templatePath: string, memberName: string) => {
		const ignoredMembers = this.configuration.ignoredMemberDiagnostics;
		ignoredMembers[templatePath] = ignoredMembers[templatePath] || [];

		if (ignoredMembers[templatePath].indexOf(memberName) === -1) {
			ignoredMembers[templatePath].push(memberName);
			this.saveConfiguration();
			this.emit(events.configurationFile.ignoredMemberDiagnosticChanged);
		}
	}
}

interface IConfiguration {
	ignoredMemberDiagnostics: IgnoredMemberDiagnostics;
}

export interface IgnoredMemberDiagnostics {
	[templatePath: string]: string[];
}
