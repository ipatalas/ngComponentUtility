'use strict';

import * as vsc from 'vscode';

import { ComponentCompletionProvider } from './providers/componentCompletionProvider';
import { MemberCompletionProvider } from './providers/memberCompletionProvider';
import { BindingProvider } from './providers/bindingProvider';
import { ComponentDefinitionProvider } from './providers/componentDefinitionProvider';
import { ReferencesProvider } from "./providers/referencesProvider";
import { FindUnusedComponentsCommand } from "./commands/findUnusedComponents";

import { ConfigurationChangeListener, IConfigurationChangedEvent } from './utils/vsc';
import { IComponentTemplate } from "./utils/component/component";
import { ComponentsCache } from './utils/component/componentsCache';
import { HtmlReferencesCache } from "./utils/htmlReferencesCache";
import { init as initGlob } from './utils/glob';
import { RoutesCache } from "./utils/routesCache";
import { MemberDefinitionProvider } from "./providers/memberDefinitionProvider";

const HTML_DOCUMENT_SELECTOR: vsc.DocumentSelector = 'html';
const TS_DOCUMENT_SELECTOR: vsc.DocumentSelector = 'typescript';
const COMMAND_REFRESHCOMPONENTS: string = 'extension.refreshAngularComponents';
const COMMAND_FINDUNUSEDCOMPONENTS: string = 'extension.findUnusedAngularComponents';

const completionProvider = new ComponentCompletionProvider();
const memberCompletionProvider = new MemberCompletionProvider();
const bindingProvider = new BindingProvider();
const definitionProvider = new ComponentDefinitionProvider();
const referencesProvider = new ReferencesProvider();
const memberDefinitionProvider = new MemberDefinitionProvider();
const findUnusedAngularComponents = new FindUnusedComponentsCommand();

const componentsCache = new ComponentsCache();
const htmlReferencesCache = new HtmlReferencesCache();
const routesCache = new RoutesCache();

const statusBar = vsc.window.createStatusBarItem(vsc.StatusBarAlignment.Left);
const configListener = new ConfigurationChangeListener("ngComponents");

export async function activate(context: vsc.ExtensionContext) {
	context.subscriptions.push(configListener, componentsCache, htmlReferencesCache, routesCache);

	try {
		initGlob(vsc.workspace.rootPath);

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

	context.subscriptions.push(vsc.commands.registerCommand(COMMAND_FINDUNUSEDCOMPONENTS, () => findUnusedAngularComponents.execute()));

	context.subscriptions.push(configListener.onDidChange((event: IConfigurationChangedEvent) => {
		if (event.hasChanged("controllerGlobs", "componentGlobs", "htmlGlobs")) {
			vsc.commands.executeCommand(COMMAND_REFRESHCOMPONENTS);
		}
	}));

	context.subscriptions.push(vsc.languages.registerCompletionItemProvider(HTML_DOCUMENT_SELECTOR, completionProvider, '<'));
	context.subscriptions.push(vsc.languages.registerCompletionItemProvider(HTML_DOCUMENT_SELECTOR, bindingProvider, ','));
	context.subscriptions.push(vsc.languages.registerCompletionItemProvider(HTML_DOCUMENT_SELECTOR, memberCompletionProvider, '.'));
	context.subscriptions.push(vsc.languages.registerDefinitionProvider(HTML_DOCUMENT_SELECTOR, definitionProvider));
	context.subscriptions.push(vsc.languages.registerDefinitionProvider(HTML_DOCUMENT_SELECTOR, memberDefinitionProvider));
	context.subscriptions.push(vsc.languages.registerReferenceProvider([HTML_DOCUMENT_SELECTOR, TS_DOCUMENT_SELECTOR], referencesProvider));

	statusBar.tooltip = 'Refresh Angular components';
	statusBar.command = COMMAND_REFRESHCOMPONENTS;
	statusBar.show();

	context.subscriptions.push(statusBar);
}

const refreshComponents = async (config?: vsc.WorkspaceConfiguration): Promise<void> => {
	return new Promise<void>(async (resolve, _reject) => {
		try {
			const references = await htmlReferencesCache.refresh(config);
			const components = await componentsCache.refresh(config);
			const routes = await routesCache.refresh(config);

			const inlineTemplates: IComponentTemplate[] = [];
			inlineTemplates.push(...getTemplatesWithBody(components));
			inlineTemplates.push(...getTemplatesWithBody(routes));

			htmlReferencesCache.loadInlineTemplates(inlineTemplates);

			findUnusedAngularComponents.load(references, components);
			referencesProvider.load(references, components);

			completionProvider.loadComponents(components);
			memberCompletionProvider.loadComponents(components);
			bindingProvider.loadComponents(components);
			definitionProvider.loadComponents(components);
			memberDefinitionProvider.loadComponents(components);

			statusBar.text = `$(sync) ${components.length} components`;
		} catch (err) {
			vsc.window.showErrorMessage("Error refreshing components, check developer console");
		}

		resolve();
	});
};

const getTemplatesWithBody = (source: Array<{ template: IComponentTemplate }>) => source.filter(c => c.template && c.template.body).map(c => c.template);
