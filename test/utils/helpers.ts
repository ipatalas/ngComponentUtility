import * as _path from 'path';
import * as ts from 'typescript';
import * as fs from 'fs';
import * as vsc from 'vscode';
import { SourceFile, ISourceFile } from '../../src/utils/sourceFile';
import { IComponentBinding } from '../../src/utils/component/component';
import { CompletionItem } from 'vscode';
import { IMember } from '../../src/utils/controller/member';

const COMPONENTS_DIR = 'components';
const CONTORLLERS_DIR = 'controllers';
const ROUTES_DIR = 'routes';
const TEMPLATES_DIR = 'templates';
const DIRECTIVES_DIR = 'directives';

const TEST_FILES_ROOT = _path.join(__dirname, '../../../test/test_files');

export const getTestFilePath = (type: string, filename: string) => _path.join(TEST_FILES_ROOT, type, filename);
export const getComponentsTestFilePath = (filename: string) => getTestFilePath(COMPONENTS_DIR, filename);
export const getTemplatesTestFilePath = (filename: string) => getTestFilePath(TEMPLATES_DIR, filename);
export const getTemplatesTestDirPath = () => _path.join(TEST_FILES_ROOT, TEMPLATES_DIR);

export const getControllerSourceFile = (name: string) => getSourceFile(CONTORLLERS_DIR, name);
export const getDirectiveSourceFile = (name: string) => getSourceFile(DIRECTIVES_DIR, name);
export const getComponentSourceFile = (name: string) => getSourceFile(COMPONENTS_DIR, name);
export const getRouteSourceFile = (name: string) => getSourceFile(ROUTES_DIR, name);

function getSourceFile(type: string, name: string): SourceFile {
	const path = getTestFilePath(type, name);
	const sourceFile = ts.createSourceFile(name, fs.readFileSync(path, 'utf8'), ts.ScriptTarget.ES5, true) as ISourceFile;
	sourceFile.fullpath = path;

	return new SourceFile(sourceFile);
}

async function createDocument(type: string, contents: string) {
	const position = contents.indexOf('^');
	if (position > -1) {
		contents = contents.replace('^', '');
	}

	return {
		position: new vsc.Position(0, position),
		document: await vsc.workspace.openTextDocument({
			content: contents,
			language: type
		})
	};
}

export const createHtmlDocument = async (contents: string) => createDocument('html', contents);
export const createTypescriptDocument = async (contents: string) => createDocument('typescript', contents);

export function getTestSourceFile(contents: string): SourceFile {
	const sourceFile = ts.createSourceFile('test.ts', contents, ts.ScriptTarget.ES5, true) as ISourceFile;
	sourceFile.fullpath = 'test.ts';

	return new SourceFile(sourceFile);
}

export function createPropertyMember(name: string) {
	return <IMember> {
		name,
		isPublic: true,
		buildCompletionItem: (_bindings) => new CompletionItem(name)
	};
}

export function createBinding(name: string) {
	return <IComponentBinding>{
		name,
		buildCompletionItem: () => new CompletionItem(name)
	};
}
