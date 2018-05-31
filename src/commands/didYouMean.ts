import * as vsc from 'vscode';
import { Commands } from './commands';

export class DidYouMeanCommand implements vsc.Disposable {
	private disposable: vsc.Disposable;

	constructor() {
		this.disposable = vsc.commands.registerTextEditorCommand(Commands.MemberDiagnostic.DidYouMean, this.execute);
	}

	public dispose() {
		this.disposable && this.disposable.dispose();
	}

	public execute = (_textEditor: vsc.TextEditor, edit: vsc.TextEditorEdit, range: vsc.Range, replacement: string) => {
		edit.replace(range, replacement);
	}
}
