import * as vsc from 'vscode';
import * as path from 'path';
import didYouMean = require('didyoumean2');

import { Commands } from '../commands/commands';
import { RelativePath } from '../utils/htmlTemplate/relativePath';
import { IComponentBase } from '../utils/component/component';
import { getMembersAndBindingsFunction, GetMembersAndBindingsFunctionType } from '../utils/component/helpers';

export class CodeActionProvider implements vsc.CodeActionProvider {
	private getMembersAndBindings: GetMembersAndBindingsFunctionType;
	private components = new Map<string, IComponentBase>();

	constructor(private getConfig: () => vsc.WorkspaceConfiguration) {
		this.getMembersAndBindings = getMembersAndBindingsFunction(getConfig);
	}

	public loadComponents = (components: IComponentBase[]) => {
		this.components = new Map<string, IComponentBase>(
			components.filter(c => c.template).map(c => <[string, IComponentBase]>[new RelativePath(c.template.path).relativeLowercase, c])
		);
	}

	public provideCodeActions(document: vsc.TextDocument, range: vsc.Range, ctx: vsc.CodeActionContext, _t: vsc.CancellationToken): vsc.ProviderResult<vsc.Command[]> {
		const relativePath = RelativePath.fromUri(document.uri);
		const component = this.components.get(relativePath.relativeLowercase);
		const results: vsc.Command[] = [];

		const diag = ctx.diagnostics.find(d => d.range.isEqual(range));

		if (diag) {
			if (component) {
				const { members, bindings } = this.getMembersAndBindings(component);
				const allMembersNames = [
					...members.map(m => m.name),
					...bindings.map(b => b.name)
				];

				const config = this.getConfig();
				const options = this.buildDidYouMeanOptions(config);
				const matches: string[] = didYouMean(diag.code, allMembersNames, options);

				if (matches.length > 0) {
					const maxResults = config.get<number>('memberDiagnostics.didYouMean.maxResults', 2);
					const rangeToReplace = range.with(range.start.translate(undefined, component.controllerAs.length + 1));

					results.push(...matches.slice(0, maxResults).map(m => ({
						command: Commands.MemberDiagnostic.DidYouMean,
						title: `Did you mean '${m}'?`,
						arguments: [rangeToReplace, m]
					})));
				}
			}

			results.push({
				command: Commands.MemberDiagnostic.IgnoreMember,
				title: `Ignore '${diag.code}' errors inside '${path.basename(document.uri.fsPath)}' (this workspace)`,
				arguments: [relativePath, diag.code]
			});
		}

		return results;
	}

	private buildDidYouMeanOptions = (config: vsc.WorkspaceConfiguration) => {
		const similarityThresold = config.get<number>('memberDiagnostics.didYouMean.similarityThreshold', 0.6);

		return {
			threshold: similarityThresold,
			returnType: 'all-sorted-matches'
		};
	}
}
