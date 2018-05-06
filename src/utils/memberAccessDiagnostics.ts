import * as vsc from 'vscode';
import { IMemberAccessResults } from './htmlTemplate/htmlTemplateInfoCache';
import { RelativePath } from './htmlTemplate/relativePath';
import { Component } from './component/component';
import _ = require('lodash');
import { IMemberAccessEntry } from './htmlTemplate/streams/memberAccessParser';

export class MemberAccessDiagnostics {
	public getDiagnostics = (components: Component[], results: IMemberAccessResults): DiagnosticsByTemplate => {
		const allowedMembersByTemplate = components.reduce((map, component) => {
			const relativePath = new RelativePath(component.template.path).relative;

			map[relativePath] = map[relativePath] || [];
			map[relativePath].push(..._.uniq([
				...component.bindings.map(b => b.name),
				...component.controller.members.map(m => m.name)
			]));
			return map;
		}, <IMembersByTemplate>{});

		return Object.entries(results)
			.reduce((allInvalid, [relativePath, members]) => {
				const invalidMembers = members.filter(m => !allowedMembersByTemplate[relativePath].some(x => x === m.memberName));
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
