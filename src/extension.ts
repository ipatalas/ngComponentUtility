'use strict';

import * as vsc from 'vscode';
import * as prettyHrtime from 'pretty-hrtime';

import { FindUnusedComponentsCommand } from './commands/findUnusedComponents';

import { ComponentCompletionProvider } from './providers/componentCompletionProvider';
import { MemberCompletionProvider } from './providers/memberCompletionProvider';
import { BindingProvider } from './providers/bindingProvider';
import { ComponentDefinitionProvider } from './providers/componentDefinitionProvider';
import { ReferencesProvider } from './providers/referencesProvider';
import { MemberDefinitionProvider } from './providers/memberDefinitionProvider';
import { MemberReferencesProvider } from './providers/memberReferencesProvider';

import { IComponentTemplate, Component } from './utils/component/component';
import { ComponentsCache } from './utils/component/componentsCache';
import { HtmlTemplateInfoCache } from './utils/htmlTemplate/htmlTemplateInfoCache';
import { RoutesCache } from './utils/route/routesCache';
import { Route } from './utils/route/route';

import { ConfigurationChangeListener, IConfigurationChangedEvent } from './utils/configurationChangeListener';
import { logVerbose, log, logError } from './utils/logging';
import { shouldActivateExtension, notAngularProject, markAsAngularProject, alreadyAngularProject, getConfiguration } from './utils/vsc';
import { events } from './symbols';
import { MemberAccessDiagnostics } from './utils/memberAccessDiagnostics';
import { IHtmlTemplateInfoResults, ITemplateInfo } from './utils/htmlTemplate/types';
import { HtmlDocumentHelper } from './utils/htmlDocumentHelper';

const HTML_DOCUMENT_SELECTOR = <vsc.DocumentFilter>{ language: 'html', scheme: 'file' };
const TS_DOCUMENT_SELECTOR = <vsc.DocumentFilter>{ language: 'typescript', scheme: 'file' };
const COMMAND_REFRESHCOMPONENTS: string = 'extension.refreshAngularComponents';
const COMMAND_FINDUNUSEDCOMPONENTS: string = 'extension.findUnusedAngularComponents';
const COMMAND_MARKASANGULAR: string = 'extension.markAsAngularProject';
const COMMANDS = [COMMAND_FINDUNUSEDCOMPONENTS, COMMAND_REFRESHCOMPONENTS];

const getConfig = () => vsc.workspace.getConfiguration('ngComponents');

const htmlDocumentHelper = new HtmlDocumentHelper();

export class Extension {
	private completionProvider = new ComponentCompletionProvider(htmlDocumentHelper);
	private memberCompletionProvider = new MemberCompletionProvider(getConfig);
	private bindingProvider = new BindingProvider();
	private definitionProvider = new ComponentDefinitionProvider(htmlDocumentHelper, getConfig);
	private referencesProvider = new ReferencesProvider(htmlDocumentHelper);
	private memberReferencesProvider = new MemberReferencesProvider();
	private memberDefinitionProvider = new MemberDefinitionProvider();
	private findUnusedAngularComponents = new FindUnusedComponentsCommand();

	private componentsCache = new ComponentsCache();
	private htmlTemplateInfoCache = new HtmlTemplateInfoCache();
	private routesCache = new RoutesCache();
	private memberAccessDiagnostics = new MemberAccessDiagnostics();

	private statusBar = vsc.window.createStatusBarItem(vsc.StatusBarAlignment.Left);
	private configListener = new ConfigurationChangeListener('ngComponents');

	private latestComponents: Component[];
	private latestHtmlTemplateInfoResults: IHtmlTemplateInfoResults;
	private latestRoutes: Route[];
	private diagnosticCollection: vsc.DiagnosticCollection;

	public activate = async (context: vsc.ExtensionContext) => {
		if (!shouldActivateExtension()) {
			COMMANDS.forEach(cmd => context.subscriptions.push(vsc.commands.registerCommand(cmd, notAngularProject)));
			context.subscriptions.push(vsc.commands.registerCommand(COMMAND_MARKASANGULAR, markAsAngularProject));
			return;
		}

		this.diagnosticCollection = vsc.languages.createDiagnosticCollection('diag-name');

		context.subscriptions.push(this.configListener, this.componentsCache, this.htmlTemplateInfoCache, this.routesCache);
		context.subscriptions.push(vsc.commands.registerCommand(COMMAND_MARKASANGULAR, alreadyAngularProject));

		try {
			await this.refreshComponents();

			this.componentsCache.on(events.componentsChanged, this.componentsChanged);
			this.routesCache.on(events.routesChanged, this.routesChanged);
			this.htmlTemplateInfoCache.on(events.htmlReferencesChanged, this.htmlReferencesChanged);
		} catch (err) {
			logError(err);
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
			vsc.languages.registerReferenceProvider(TS_DOCUMENT_SELECTOR, this.memberReferencesProvider),
			this.diagnosticCollection
		]);

		this.statusBar.tooltip = 'Refresh Angular components';
		this.statusBar.command = COMMAND_REFRESHCOMPONENTS;
		this.statusBar.show();

		context.subscriptions.push(this.statusBar);
	}

	private componentsChanged = (components: Component[]) => this.refreshAllProviders(components);
	private routesChanged = (routes: Route[]) => this.refreshAllProviders(undefined, routes);
	private htmlReferencesChanged = (templateInfoResults: IHtmlTemplateInfoResults) => this.refreshAllProviders(undefined, undefined, templateInfoResults);

	private refreshAllProviders = (components?: Component[], routes?: Route[], templateInfoResults?: IHtmlTemplateInfoResults) => {
		components = components || this.latestComponents;
		routes = routes || this.latestRoutes;
		templateInfoResults = templateInfoResults || this.latestHtmlTemplateInfoResults;

		const componentsAndRoutes = [...components, ...routes];
		const inlineTemplates: IComponentTemplate[] = this.getTemplatesWithBody(componentsAndRoutes);

		this.htmlTemplateInfoCache.loadInlineTemplates(inlineTemplates);

		this.findUnusedAngularComponents.load(templateInfoResults.htmlReferences, components);
		this.referencesProvider.load(templateInfoResults.htmlReferences, components);
		this.memberReferencesProvider.load(componentsAndRoutes);

		this.completionProvider.loadComponents(components);
		this.memberCompletionProvider.loadComponents(componentsAndRoutes);
		this.bindingProvider.loadComponents(components);
		this.definitionProvider.loadComponents(components);
		this.memberDefinitionProvider.loadComponents(componentsAndRoutes, templateInfoResults.templateInfo);

		this.refreshMemberAccessDiagnostics(templateInfoResults.templateInfo);
	}

	private refreshMemberAccessDiagnostics = (templateInfo: ITemplateInfo) => {
		this.diagnosticCollection.clear();

		const config = getConfiguration();
		const isMemberDiagnosticEnabled = config.get<boolean>('memberDiagnostics.enabled');
		if (isMemberDiagnosticEnabled) {
			logVerbose(`Reloading member diagnostics`);
			const componentsAndRoutes = [...this.latestComponents, ...this.latestRoutes];

			const diagnostics = this.memberAccessDiagnostics.getDiagnostics(componentsAndRoutes, templateInfo);

			this.diagnosticCollection.set(diagnostics);
		}
	}

	private refreshComponents = async (): Promise<void> => {
		return new Promise<void>(async (resolve, _reject) => {
			try {
				const { components, controllers } = await this.componentsCache.refresh();
				this.latestRoutes = await this.routesCache.refresh(controllers);
				this.latestHtmlTemplateInfoResults = await this.htmlTemplateInfoCache.refresh([...components, ...this.latestRoutes]);
				this.latestComponents = components;

				let postprocessingTime = process.hrtime();

				this.refreshAllProviders(this.latestComponents, this.latestRoutes, this.latestHtmlTemplateInfoResults);

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
