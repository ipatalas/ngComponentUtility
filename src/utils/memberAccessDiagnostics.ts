import * as vsc from 'vscode';
import _ = require('lodash');
import util = require('util');

import { ITemplateInfo } from './htmlTemplate/types';
import { RelativePath } from './htmlTemplate/relativePath';
import { IComponentBase } from './component/component';
import { IMemberAccessEntry } from './htmlTemplate/streams/memberAccessParser';

export class MemberAccessDiagnostics {
	constructor(private getConfig: () => vsc.WorkspaceConfiguration) {}

	public getDiagnostics = (components: IComponentBase[], templateInfo: ITemplateInfo): DiagnosticsByTemplate => {
		const config = this.getConfig();
		const checkBindings = config.get<boolean>('memberDiagnostics.html.checkBindings');
		const checkMembers = config.get<boolean>('memberDiagnostics.html.checkControllerMembers');

		const componentMembers = this.getComponentMembers(components, checkBindings, checkMembers);
		const messageFormat = this.getMessage(checkBindings, checkMembers);

		const isComponentMember =
			(relativePath: string, m: IMemberAccessEntry) => componentMembers[relativePath] && componentMembers[relativePath].some(x => x === m.memberName);

		const isFormMember =
			(relativePath: string, m: IMemberAccessEntry) => templateInfo[relativePath] && templateInfo[relativePath].forms.some(form => form.name === m.expression);

		return Object.entries(templateInfo)
			.reduce((allInvalid, [relativePath, template]) => {
				const invalidMembers = template.memberAccess.filter(m => !isComponentMember(relativePath, m) && !isFormMember(relativePath, m));

				if (invalidMembers.length > 0) {
					allInvalid.push([
						vsc.Uri.file(RelativePath.toAbsolute(relativePath)),
						invalidMembers.map(m => this.buildDiagnostic(m, messageFormat))
					]);
				}

				return allInvalid;
			}, <DiagnosticsByTemplate>[]);
	}

	private getMessage(checkBindings: boolean, checkMembers: boolean): string {
		const parts = [];
		if (checkBindings) parts.push('a binding');
		if (checkMembers) parts.push('a field');

		return `Member '%s' does not exist as ${parts.join(' or ')} in the component`;
	}

	private buildDiagnostic = (member: IMemberAccessEntry, messageFormat: string) => {
		const range = new vsc.Range(member.line, member.character, member.line, member.character + member.expression.length);
		const message = util.format(messageFormat, member.memberName);

		return new vsc.Diagnostic(range, message, vsc.DiagnosticSeverity.Warning);
	}

	private getComponentMembers(components: IComponentBase[], checkBindings: boolean, checkMembers: boolean) {
		return components.filter(c => c.template && !c.template.body).reduce((map, component) => {
			const templateRelativePath = new RelativePath(component.template.path).relative;
			const allMembers: string[] = [];

			if (checkBindings) {
				allMembers.push(...component.getBindings().map(b => b.name));
			}

			if (checkMembers && component.controller) {
				allMembers.push(...component.controller.getMembers(false).map(m => m.name));
			}

			map[templateRelativePath] = map[templateRelativePath] || [];
			map[templateRelativePath].push(..._.uniq(allMembers));
			return map;
		}, <IMembersByTemplate>{});
	}
}

interface IMembersByTemplate {
	[relativeTemplatePath: string]: string[];
}

export type DiagnosticsByTemplate = Array<[vsc.Uri, vsc.Diagnostic[]]>;
