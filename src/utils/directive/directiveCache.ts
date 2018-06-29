'use strict';

import * as vsc from 'vscode';
import { SourceFilesScanner } from '../sourceFilesScanner';
import { SourceFile } from '../sourceFile';
import { FileWatcher } from '../fileWatcher';
import { EventEmitter } from 'events';
import { events } from '../../symbols';
import { logError } from '../logging';
import { getConfiguration } from '../vsc';
import { RelativePath } from '../htmlTemplate/relativePath';
import { Directive } from './directive';

export class DirectiveCache extends EventEmitter implements vsc.Disposable {
	private scanner = new SourceFilesScanner();
	private directives: Directive[] = [];
	private watcher: FileWatcher;

	private emitDirectivesChanged = () => this.emit(events.directivesChanged, this.directives);

	private setupWatchers = (config: vsc.WorkspaceConfiguration) => {
		const globs = config.get('directiveGlobs') as string[];

		this.dispose();
		this.watcher = new FileWatcher('Directive', globs, this.onAdded, this.onChanged, this.onDeleted);
	}

	private onAdded = async (uri: vsc.Uri) => {
		const src = await SourceFile.parse(uri.fsPath);
		const directives = await Directive.parse(src);

		this.directives.push(...directives);
		this.emitDirectivesChanged();
	}

	private onChanged = async (uri: vsc.Uri) => {
		const filepath = RelativePath.fromUri(uri);

		const idx = this.directives.findIndex(c => filepath.equals(c.path));
		if (idx === -1) {
			// tslint:disable-next-line:no-console
			console.warn('Directive does not exist, cannot update it');
			return;
		}

		const src = await SourceFile.parse(filepath.absolute);
		const directives = await Directive.parse(src);

		this.deleteDirectiveFile(filepath);
		this.directives.push(...directives);
		this.emitDirectivesChanged();
	}

	private onDeleted = (uri: vsc.Uri) => {
		this.deleteDirectiveFile(RelativePath.fromUri(uri));
		this.emitDirectivesChanged();
	}

	private deleteDirectiveFile = (filepath: RelativePath) => {
		let idx;
		do {
			idx = this.directives.findIndex(c => filepath.equals(c.path));
			if (idx > -1) {
				this.directives.splice(idx, 1);
			}
		} while (idx > -1);
	}

	public refresh = async (): Promise<Directive[]> => {
		try {
			const config = getConfiguration();

			this.setupWatchers(config);

			this.directives = await this.scanner.findFiles('directiveGlobs', src => Directive.parse(src), 'Directive');
			return this.directives;
		} catch (err) {
			logError(err);
			vsc.window.showErrorMessage('There was an error refreshing directives cache, check console for errors');
			return [];
		}
	}

	public dispose() {
		if (this.watcher) {
			this.watcher.dispose();
		}

		this.removeAllListeners();
	}
}
