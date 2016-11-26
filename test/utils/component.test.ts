import * as assert from 'assert';
import * as path from 'path';
import * as ts from "typescript";
import * as fs from 'fs';
import * as _ from 'lodash';

import { Component, IComponentBinding } from '../../src/utils/component';

const TEST_FILES_ROOT = path.join(__dirname, '../../../test/test_files');

const getTestFilePath = (filename: string) => path.join(TEST_FILES_ROOT, filename);

describe('Give Component class', () => {
	describe('when calling parse in AST mode', () => {
		let files = ['component_simple.ts', 'component_comments.ts'];

		testFiles(files);
	});
});

function testFiles(files: string[]) {
	files.forEach((file) => {
		it(`with '${file}' file then a properly parsed component is returned`, async () => {
			let path = getTestFilePath(file);
			let sourceFile = ts.createSourceFile(file, fs.readFileSync(path, 'utf8'), ts.ScriptTarget.ES5, true);

			let component = await Component.parse({ path, sourceFile }, []);

			assert.equal(component.length, 1);
			assert.equal(component[0].name, 'exampleComponent');
			let bindings = component[0].bindings.map(b => _.pick(b, ['name', 'htmlName', 'type']));
			assert.deepEqual(bindings, [
				<IComponentBinding>{
					name: "config",
					htmlName: "config",
					type: "<"
				},
				<IComponentBinding>{
					name: "data",
					htmlName: "data",
					type: "<"
				}
			]);
		});
	});
}
