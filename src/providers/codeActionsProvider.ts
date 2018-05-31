import * as vsc from 'vscode';
import * as path from 'path';
import { Commands } from '../commands/commands';
import { RelativePath } from '../utils/htmlTemplate/relativePath';

export class CodeActionProvider implements vsc.CodeActionProvider {
	public provideCodeActions(document: vsc.TextDocument, range: vsc.Range, context: vsc.CodeActionContext, _token: vsc.CancellationToken)
		: vsc.ProviderResult<vsc.Command[]> {
		const diag = context.diagnostics.find(d => d.range.isEqual(range));

		if (diag) {
			return [{
				command: Commands.MemberDiagnostic.IgnoreMember,
				title: `Ignore '${diag.code}' errors inside '${path.basename(document.uri.fsPath)}' (this workspace)`,
				tooltip: 'tooltip',
				arguments: [
					RelativePath.fromUri(document.uri),
					diag.code
				]
			}];
		}
	}
}
