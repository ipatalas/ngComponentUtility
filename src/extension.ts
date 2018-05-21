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

import { ConfigurationChangeListener } from './utils/configurationChangeListener';
import { logVerbose, log, logError } from './utils/logging';
import { shouldActivateExtension, notAngularProject, markAsAngularProject, alreadyAngularProject, getConfiguration } from './utils/vsc';
import { events } from './symbols';
import { MemberAccessDiagnostics } from './utils/memberAccessDiagnostics';
import { IHtmlTemplateInfoResults, ITemplateInfo } from './utils/htmlTemplate/types';
import { Commands } from './commands/commands';
import { SwitchComponentPartsCommand } from './commands/switchComponentParts';

const HTML_DOCUMENT_SELECTOR = <vsc.DocumentFilter>{ language: 'html', scheme: 'file' };
const TS_DOCUMENT_SELECTOR = <vsc.DocumentFilter>{ language: 'typescript', scheme: 'file' };

export class Extension {
	private completionProvider = new ComponentCompletionProvider();
	private memberCompletionProvider = new MemberCompletionProvider();
	private bindingProvider = new BindingProvider();
	private definitionProvider = new ComponentDefinitionProvider();
	private referencesProvider = new ReferencesProvider();
	private memberReferencesProvider = new MemberReferencesProvider();
	private memberDefinitionProvider = new MemberDefinitionProvider();
	private findUnusedAngularComponentsCommand = new FindUnusedComponentsCommand();

	private componentsCache = new ComponentsCache();
	private htmlTemplateInfoCache = new HtmlTemplateInfoCache();
	private routesCache = new RoutesCache();
	private memberAccessDiagnostics = new MemberAccessDiagnostics(getConfiguration);

	private statusBar = vsc.window.createStatusBarItem(vsc.StatusBarAlignment.Left);
	private configListener = new ConfigurationChangeListener('ngComponents');

	private latestComponents: Component[];
	private latestHtmlTemplateInfoResults: IHtmlTemplateInfoResults;
	private latestRoutes: Route[];
	private diagnosticCollection: vsc.DiagnosticCollection;

	public activate = async (context: vsc.ExtensionContext) => {
		if (!shouldActivateExtension()) {
			context.subscriptions.push(vsc.commands.registerCommand(Commands.MarkAsAngularProject, markAsAngularProject));

			const remainingCommands = Object.values(Commands).filter(c => c !== Commands.MarkAsAngularProject);
			remainingCommands.forEach(cmd => context.subscriptions.push(vsc.commands.registerCommand(cmd, notAngularProject)));
			return;
		}

		this.diagnosticCollection = vsc.languages.createDiagnosticCollection('member-diagnostics');

		context.subscriptions.push(this.configListener, this.componentsCache, this.htmlTemplateInfoCache, this.routesCache);
		context.subscriptions.push(vsc.commands.registerCommand(Commands.MarkAsAngularProject, alreadyAngularProject));

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
			new SwitchComponentPartsCommand(this.getComponents),
			vsc.commands.registerCommand(Commands.RefreshComponents, this.refreshComponentsCommand),
			vsc.commands.registerCommand(Commands.RefreshMemberDiagnostics, this.refreshMemberDiagnosticsCommand),
			vsc.commands.registerCommand(Commands.FindUnusedComponents,
				() => this.findUnusedAngularComponentsCommand.execute(this.latestHtmlTemplateInfoResults.htmlReferences, this.latestComponents)),
			vsc.languages.registerCompletionItemProvider(HTML_DOCUMENT_SELECTOR, this.completionProvider, '<'),
			vsc.languages.registerCompletionItemProvider(HTML_DOCUMENT_SELECTOR, this.bindingProvider, ','),
			vsc.languages.registerCompletionItemProvider(HTML_DOCUMENT_SELECTOR, this.memberCompletionProvider, '.'),
			vsc.languages.registerDefinitionProvider(HTML_DOCUMENT_SELECTOR, this.definitionProvider),
			vsc.languages.registerDefinitionProvider(HTML_DOCUMENT_SELECTOR, this.memberDefinitionProvider),
			vsc.languages.registerReferenceProvider([HTML_DOCUMENT_SELECTOR, TS_DOCUMENT_SELECTOR], this.referencesProvider),
			vsc.languages.registerReferenceProvider(TS_DOCUMENT_SELECTOR, this.memberReferencesProvider),
			this.diagnosticCollection
		]);

		this.configListener.registerListener(['controllerGlobs', 'componentGlobs', 'htmlGlobs'], () => vsc.commands.executeCommand(Commands.RefreshComponents));
		this.configListener.registerListener(['memberDiagnostics.html'], this.refreshMemberDiagnosticsCommand);

		this.statusBar.tooltip = 'Refresh Angular components';
		this.statusBar.command = Commands.RefreshComponents;
		this.statusBar.show();

		context.subscriptions.push(this.statusBar);
	}

	private getComponents = () => this.latestComponents;

	private componentsChanged = (components: Component[]) => this.refreshAllProviders(components);
	private routesChanged = (routes: Route[]) => this.refreshAllProviders(undefined, routes);
	private htmlReferencesChanged = (templateInfoResults: IHtmlTemplateInfoResults) => this.refreshAllProviders(undefined, undefined, templateInfoResults);

	private refreshAllProviders = (components?: Component[], routes?: Route[], templateInfoResults?: IHtmlTemplateInfoResults) => {
		try {
			this.latestComponents = components || this.latestComponents;
			this.latestRoutes = routes || this.latestRoutes;
			this.latestHtmlTemplateInfoResults = templateInfoResults || this.latestHtmlTemplateInfoResults;

			const componentsAndRoutes = [...this.latestComponents, ...this.latestRoutes];
			const inlineTemplates: IComponentTemplate[] = this.getTemplatesWithBody(componentsAndRoutes);

			this.htmlTemplateInfoCache.loadInlineTemplates(inlineTemplates);

			this.referencesProvider.load(this.latestHtmlTemplateInfoResults.htmlReferences, this.latestComponents);
			this.memberReferencesProvider.load(componentsAndRoutes);

			this.completionProvider.loadComponents(this.latestComponents);
			this.memberCompletionProvider.loadComponents(componentsAndRoutes);
			this.bindingProvider.loadComponents(this.latestComponents);
			this.definitionProvider.loadComponents(this.latestComponents);
			this.memberDefinitionProvider.loadComponents(componentsAndRoutes, this.latestHtmlTemplateInfoResults.templateInfo);

			this.refreshMemberAccessDiagnostics(this.latestHtmlTemplateInfoResults.templateInfo);
		} catch (err) {
			logError(err);
		}
	}

	private refreshComponentsCommand = () => {
		let t = process.hrtime();
		this.refreshComponents().then(() => {
			t = process.hrtime(t);
			vsc.window.showInformationMessage(`Components cache has been rebuilt (${prettyHrtime(t)})`);
		});
	}

	private refreshMemberDiagnosticsCommand = () => this.refreshMemberAccessDiagnostics(this.latestHtmlTemplateInfoResults.templateInfo);

	private refreshMemberAccessDiagnostics = (templateInfo: ITemplateInfo) => {
		this.diagnosticCollection.clear();

		const config = getConfiguration();
		const isMemberDiagnosticEnabled = config.get<boolean>('memberDiagnostics.enabled');
		const checkBindings = config.get<boolean>('memberDiagnostics.html.checkBindings');
		const checkMembers = config.get<boolean>('memberDiagnostics.html.checkControllerMembers');

		if (isMemberDiagnosticEnabled && (checkBindings || checkMembers)) {
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
				logError(err);
				vsc.window.showErrorMessage('Error refreshing components, check developer console');
			}

			resolve();
		});
	}

	private getTemplatesWithBody = (source: Array<{ template: IComponentTemplate }>) => source.filter(c => c.template && c.template.body).map(c => c.template);
}
