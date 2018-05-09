import * as _path from 'path';
import * as ts from 'typescript';
import * as fs from 'fs';
import { SourceFile, ISourceFile } from '../../src/utils/sourceFile';

const COMPONENTS_DIR = 'components';
const CONTORLLERS_DIR = 'controllers';
const ROUTES_DIR = 'routes';

const TEST_FILES_ROOT = _path.join(__dirname, '../../../test/test_files');

export const getTestFilePath = (type: string, filename: string) => _path.join(TEST_FILES_ROOT, type, filename);
export const getComponentsTestFilePath = (filename: string) => getTestFilePath(COMPONENTS_DIR, filename);

export const getControllerSourceFile = (name: string) => getSourceFile(CONTORLLERS_DIR, name);
export const getComponentSourceFile = (name: string) => getSourceFile(COMPONENTS_DIR, name);
export const getRouteSourceFile = (name: string) => getSourceFile(ROUTES_DIR, name);

function getSourceFile(type: string, name: string): SourceFile {
	const path = getTestFilePath(type, name);
	const sourceFile = ts.createSourceFile(name, fs.readFileSync(path, 'utf8'), ts.ScriptTarget.ES5, true) as ISourceFile;
	sourceFile.fullpath = path;

	return new SourceFile(sourceFile);
}
