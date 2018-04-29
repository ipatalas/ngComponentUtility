import * as vsc from 'vscode';
import { Extension } from './extension';

const extension = new Extension();

export async function activate(context: vsc.ExtensionContext) {
	extension.activate(context);
}
