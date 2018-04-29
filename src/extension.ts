'use strict';

import * as vsc from 'vscode';

import { ComponentCompletionProvider } from './providers/componentCompletionProvider';
import { MemberCompletionProvider } from './providers/memberCompletionProvider';
import { BindingProvider } from './providers/bindingProvider';
import { ComponentDefinitionProvider } from './providers/componentDefinitionProvider';
import { ReferencesProvider } from './providers/referencesProvider';
import { FindUnusedComponentsCommand } from './commands/findUnusedComponents';

import { IComponentTemplate, Component } from './utils/component/component';
import { ComponentsCache } from './utils/component/componentsCache';
import { HtmlReferencesCache, IHtmlReferences } from './utils/htmlReferencesCache';
import { RoutesCache } from './utils/routesCache';
import { MemberDefinitionProvider } from './providers/memberDefinitionProvider';
import { ConfigurationChangeListener, IConfigurationChangedEvent } from './utils/configurationChangeListener';
import { logVerbose, log } from './utils/logging';
import { shouldActivateExtension, notAngularProject, markAsAngularProject, alreadyAngularProject } from './utils/vsc';
import { MemberReferencesProvider } from './providers/memberReferencesProvider';
import * as prettyHrtime from 'pretty-hrtime';
import { events } from './symbols';
import { Route } from './utils/route';

const HTML_DOCUMENT_SELECTOR = 'html';
const TS_DOCUMENT_SELECTOR = 'typescript';
const COMMAND_REFRESHCOMPONENTS: string = 'extension.refreshAngularComponents';
const COMMAND_FINDUNUSEDCOMPONENTS: string = 'extension.findUnusedAngularComponents';
const COMMAND_MARKASANGULAR: string = 'extension.markAsAngularProject';
const COMMANDS = [COMMAND_FINDUNUSEDCOMPONENTS, COMMAND_REFRESHCOMPONENTS];

export class Extension {
	private completionProvider = new ComponentCompletionProvider();
	private memberCompletionProvider = new MemberCompletionProvider();
	private bindingProvider = new BindingProvider();
	private definitionProvider = new ComponentDefinitionProvider();
	private referencesProvider = new ReferencesProvider();
	private memberReferencesProvider = new MemberReferencesProvider();
	private memberDefinitionProvider = new MemberDefinitionProvider();
	private findUnusedAngularComponents = new FindUnusedComponentsCommand();

	private componentsCache = new ComponentsCache();
	private htmlReferencesCache = new HtmlReferencesCache();
	private routesCache = new RoutesCache();

	private statusBar = vsc.window.createStatusBarItem(vsc.StatusBarAlignment.Left);
	private configListener = new ConfigurationChangeListener('ngComponents');

	private latestComponents: Component[];
	private latestHtmlReferences: IHtmlReferences;
	private latestRoutes: Route[];

	public activate = async (context: vsc.ExtensionContext) => {
		if (!shouldActivateExtension()) {
			COMMANDS.forEach(cmd => context.subscriptions.push(vsc.commands.registerCommand(cmd, notAngularProject)));
			context.subscriptions.push(vsc.commands.registerCommand(COMMAND_MARKASANGULAR, markAsAngularProject));
			return;
		}

		context.subscriptions.push(this.configListener, this.componentsCache, this.htmlReferencesCache, this.routesCache);
		context.subscriptions.push(vsc.commands.registerCommand(COMMAND_MARKASANGULAR, alreadyAngularProject));

		try {
			await this.refreshComponents();

			this.componentsCache.on(events.componentsChanged, this.componentsChanged);
			this.routesCache.on(events.routesChanged, this.routesChanged);
			this.htmlReferencesCache.on(events.htmlReferencesChanged, this.htmlReferencesChanged);
		} catch (err) {
			// tslint:disable-next-line:no-console
			console.error(err);
			vsc.window.showErrorMessage('Error initializing extension');
		}

		context.subscriptions.push.apply(context.subscriptions, [
			vsc.commands.registerCommand(COMMAND_REFRESHCOMPONENTS, () => {
				let t = process.hrtime();
				this.refreshComponents().then(() => {
					t = process.hrtime(t);
					vsc.window.showInformationMessage(`Components cache has been rebuilt (${prettyHrtime(t)})`);
				});
			}),
			this.configListener.onDidChange((event: IConfigurationChangedEvent) => {
				if (event.hasChanged('controllerGlobs', 'componentGlobs', 'htmlGlobs')) {
					vsc.commands.executeCommand(COMMAND_REFRESHCOMPONENTS);
				}
			}),
			vsc.commands.registerCommand(COMMAND_FINDUNUSEDCOMPONENTS, () => this.findUnusedAngularComponents.execute()),
			vsc.languages.registerCompletionItemProvider(HTML_DOCUMENT_SELECTOR, this.completionProvider, '<'),
			vsc.languages.registerCompletionItemProvider(HTML_DOCUMENT_SELECTOR, this.bindingProvider, ','),
			vsc.languages.registerCompletionItemProvider(HTML_DOCUMENT_SELECTOR, this.memberCompletionProvider, '.'),
			vsc.languages.registerDefinitionProvider(HTML_DOCUMENT_SELECTOR, this.definitionProvider),
			vsc.languages.registerDefinitionProvider(HTML_DOCUMENT_SELECTOR, this.memberDefinitionProvider),
			vsc.languages.registerReferenceProvider([HTML_DOCUMENT_SELECTOR, TS_DOCUMENT_SELECTOR], this.referencesProvider),
			vsc.languages.registerReferenceProvider(TS_DOCUMENT_SELECTOR, this.memberReferencesProvider)
		]);

		this.statusBar.tooltip = 'Refresh Angular components';
		this.statusBar.command = COMMAND_REFRESHCOMPONENTS;
		this.statusBar.show();

		context.subscriptions.push(this.statusBar);
	}

	private componentsChanged = (components: Component[]) => this.refreshAllProviders(components);
	private routesChanged = (routes: Route[]) => this.refreshAllProviders(undefined, routes);
	private htmlReferencesChanged = (htmlReferences: IHtmlReferences) => this.refreshAllProviders(undefined, undefined, htmlReferences);

	private refreshAllProviders = (components?: Component[], routes?: Route[], htmlReferences?: IHtmlReferences) => {
		components = components || this.latestComponents;
		routes = routes || this.latestRoutes;
		htmlReferences = htmlReferences || this.latestHtmlReferences;

		const inlineTemplates: IComponentTemplate[] = [];
		inlineTemplates.push(...this.getTemplatesWithBody(components));
		inlineTemplates.push(...this.getTemplatesWithBody(routes));

		this.htmlReferencesCache.loadInlineTemplates(inlineTemplates);

		this.findUnusedAngularComponents.load(htmlReferences, components);
		this.referencesProvider.load(htmlReferences, components);
		this.memberReferencesProvider.load(components);

		this.completionProvider.loadComponents(components);
		this.memberCompletionProvider.loadComponents(components);
		this.bindingProvider.loadComponents(components);
		this.definitionProvider.loadComponents(components);
		this.memberDefinitionProvider.loadComponents(components);
	}

	private refreshComponents = async (config?: vsc.WorkspaceConfiguration): Promise<void> => {
		return new Promise<void>(async (resolve, _reject) => {
			try {
				this.latestHtmlReferences = await this.htmlReferencesCache.refresh(config);
				this.latestComponents = await this.componentsCache.refresh(config);
				this.latestRoutes = await this.routesCache.refresh(config);

				let postprocessingTime = process.hrtime();

				this.refreshAllProviders(this.latestComponents, this.latestRoutes, this.latestHtmlReferences);

				postprocessingTime = process.hrtime(postprocessingTime);
				log(`Postprocessing time: ${prettyHrtime(postprocessingTime)}`);

				this.latestComponents.forEach(c => logVerbose(`Found component: ${c.name} { ctrl: ${c.controller && c.controller.name} } (${c.path})`));

				this.statusBar.text = `$(sync) ${this.latestComponents.length} components`;
			} catch (err) {
				// tslint:disable-next-line:no-console
				console.error(err);
				vsc.window.showErrorMessage('Error refreshing components, check developer console');
			}

			resolve();
		});
	}

	private getTemplatesWithBody = (source: Array<{ template: IComponentTemplate }>) => source.filter(c => c.template && c.template.body).map(c => c.template);
}
