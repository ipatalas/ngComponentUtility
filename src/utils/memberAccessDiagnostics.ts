import * as vsc from 'vscode';
import _ = require('lodash');

import { ITemplateInfo } from './htmlTemplate/types';
import { RelativePath } from './htmlTemplate/relativePath';
import { IComponentBase } from './component/component';
import { IMemberAccessEntry } from './htmlTemplate/streams/memberAccessParser';

export class MemberAccessDiagnostics {
	public getDiagnostics = (components: IComponentBase[], templateInfo: ITemplateInfo): DiagnosticsByTemplate => {
		const componentMembers = components.filter(c => c.template && !c.template.body).reduce((map, component) => {
			const templateRelativePath = new RelativePath(component.template.path).relative;

			const allMembers = component.getBindings().map(b => b.name);
			if (component.controller) {
				allMembers.push(...component.controller.getMembers(false).map(m => m.name));
			}

			map[templateRelativePath] = map[templateRelativePath] || [];
			map[templateRelativePath].push(..._.uniq(allMembers));
			return map;
		}, <IMembersByTemplate>{});

		const isComponentMember =
			(relativePath: string, m: IMemberAccessEntry) => componentMembers[relativePath] && componentMembers[relativePath].some(x => x === m.memberName);

		const isFormMember =
			(relativePath: string, m: IMemberAccessEntry) => templateInfo[relativePath] && templateInfo[relativePath].formNames.some(formName => formName === m.expression);

		return Object.entries(templateInfo)
			.reduce((allInvalid, [relativePath, template]) => {
				const invalidMembers = template.memberAccess.filter(m => !isComponentMember(relativePath, m) && !isFormMember(relativePath, m));

				if (invalidMembers.length > 0) {
					allInvalid.push([
						vsc.Uri.file(RelativePath.toAbsolute(relativePath)),
						invalidMembers.map(this.buildDiagnostic)
					]);
				}

				return allInvalid;
			}, <DiagnosticsByTemplate>[]);
	}

	private buildDiagnostic = (member: IMemberAccessEntry) => {
		const range = new vsc.Range(member.line, member.character, member.line, member.character + member.expression.length);
		return new vsc.Diagnostic(range, `Member '${member.memberName}' does not exist as a binding or field in the component`, vsc.DiagnosticSeverity.Warning);
	}
}

interface IMembersByTemplate {
	[relativeTemplatePath: string]: string[];
}

export type DiagnosticsByTemplate = Array<[vsc.Uri, vsc.Diagnostic[]]>;
