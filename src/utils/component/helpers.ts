import { IComponentBase, IComponentBinding } from './component';
import * as vsc from 'vscode';
import { IMember } from '../controller/member';

export type GetMembersAndBindingsFunctionType = (component: IComponentBase) => { members: IMember[], bindings: IComponentBinding[] };

export function getMembersAndBindingsFunction(getConfig: () => vsc.WorkspaceConfiguration): GetMembersAndBindingsFunctionType {
	return (component: IComponentBase) => {
		const config = getConfig();
		const publicOnly = config.get<boolean>('controller.publicMembersOnly');
		const excludedMembers = new RegExp(config.get<string>('controller.excludedMembers'));

		const members = component.controller && component.controller.getMembers(publicOnly).filter(m => !excludedMembers.test(m.name)) || [];
		const bindings = component.getBindings();

		return {
			members,
			bindings
		};
	};
}
