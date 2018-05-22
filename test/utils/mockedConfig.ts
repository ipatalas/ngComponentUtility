import { WorkspaceConfiguration, ConfigurationTarget } from 'vscode';

export class MockedConfig implements WorkspaceConfiguration {
	private _config: {[key: string]: any} = {};
	readonly [key: string]: any;

	public setMockData(config: {[key: string]: any}) {
		this._config = config;
	}

	public get<T>(section: string, defaultValue?: T): T;

	public get(section: any, defaultValue?: any) {
		return this._config[section] || defaultValue;
	}

	public has(_section: string): boolean {
		throw new Error('Method not implemented.');
	}

	public inspect<T>(_section: string): { key: string; defaultValue?: T; globalValue?: T; workspaceValue?: T; workspaceFolderValue?: T; } {
		throw new Error('Method not implemented.');
	}

	public update(_section: string, _value: any, _configurationTarget?: boolean | ConfigurationTarget): Thenable<void> {
		throw new Error('Method not implemented.');
	}
}
