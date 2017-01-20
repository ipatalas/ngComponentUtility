'use strict';

import * as vsc from 'vscode';

import { ComponentsCache } from './utils/componentsCache';
import { CompletionProvider } from './completionProvider';
import { BindingProvider } from './bindingProvider';
import { GoToDefinitionProvider } from './definitionProvider';
import { overrideConsole, revertConsole, ConfigurationChangeListener, IConfigurationChangedEvent } from './utils/vsc';

const HTML_DOCUMENT_SELECTOR: vsc.DocumentSelector = 'html';
const COMMAND_REFRESHCOMPONENTS: string = 'extension.refreshAngularComponents';

const completionProvider = new CompletionProvider();
const bindingProvider = new BindingProvider();
const definitionProvider = new GoToDefinitionProvider();
const statusBar = vsc.window.createStatusBarItem(vsc.StatusBarAlignment.Left);
const debugChannel = vsc.window.createOutputChannel("ng1.5 components utility - debug");
const componentsCache = new ComponentsCache();
const configListener = new ConfigurationChangeListener("ngComponents");

export async function activate(context: vsc.ExtensionContext) {
	context.subscriptions.push(debugChannel);
	context.subscriptions.push(configListener);
	refreshDebugConsole();

	try {
		componentsCache.init();

		await refreshComponents();
	} catch (err) {
		console.error(err);
		vsc.window.showErrorMessage("Error initializing extension");
	}

	context.subscriptions.push(vsc.commands.registerCommand(COMMAND_REFRESHCOMPONENTS, () => {
		refreshComponents().then(() => {
			vsc.window.showInformationMessage('Components cache has been rebuilt');
		});
	}));

	context.subscriptions.push(configListener.onDidChange((event: IConfigurationChangedEvent) => {
		if (event.hasChanged("debugConsole")) {
			refreshDebugConsole(event.config);
		}

		if (event.hasChanged("controllerGlobs", "componentGlobs")) {
			vsc.commands.executeCommand(COMMAND_REFRESHCOMPONENTS);
		}
	}));

	context.subscriptions.push(vsc.languages.registerCompletionItemProvider(HTML_DOCUMENT_SELECTOR, completionProvider, '<'));
	context.subscriptions.push(vsc.languages.registerCompletionItemProvider(HTML_DOCUMENT_SELECTOR, bindingProvider, ','));
	context.subscriptions.push(vsc.languages.registerDefinitionProvider(HTML_DOCUMENT_SELECTOR, definitionProvider));

	statusBar.tooltip = 'Refresh Angular components';
	statusBar.command = COMMAND_REFRESHCOMPONENTS;
	statusBar.show();

	context.subscriptions.push(statusBar);
}

const refreshDebugConsole = (config?: vsc.WorkspaceConfiguration) => {
	config = config || vsc.workspace.getConfiguration("ngComponents");

	const debugConsoleEnabled = <boolean>config.get("debugConsole");
	if (debugConsoleEnabled) {
		overrideConsole(debugChannel);
	} else {
		revertConsole();
		debugChannel.hide();
	}
};

const refreshComponents = async (config?: vsc.WorkspaceConfiguration): Promise<void> => {
	return componentsCache.refresh(config).then(components => {
		completionProvider.loadComponents(components);
		bindingProvider.loadComponents(components);
		definitionProvider.loadComponents(components);

		statusBar.text = `$(sync) ${components.length} components`;
	});
};
