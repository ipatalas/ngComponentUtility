import * as vsc from 'vscode';
import { Commands } from './commands';
import { RelativePath } from '../utils/htmlTemplate/relativePath';
import { ConfigurationFile } from '../configurationFile';

export class IgnoreMemberDiagnosticCommand implements vsc.Disposable {
	private disposable: vsc.Disposable;

	constructor(private configuration: ConfigurationFile) {
		this.disposable = vsc.commands.registerCommand(Commands.MemberDiagnostic.IgnoreMember,
			(templatePath: RelativePath, memberName: string) => this.execute(templatePath, memberName));
	}

	public dispose() {
		this.disposable && this.disposable.dispose();
	}

	public execute = (templatePath: RelativePath, memberName: string) => {
		this.configuration.addIgnoredMemberDiagnostic(templatePath.relative, memberName);
	}
}
