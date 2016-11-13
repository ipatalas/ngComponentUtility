import * as assert from 'assert';
import * as path from 'path';
import { Component, IComponentBinding, ParseMode } from '../../src/utils/component';

const TEST_FILES_ROOT = path.join(__dirname, '../../../test/test_files');

const getTestFilePath = (filename: string) => path.join(TEST_FILES_ROOT, filename);

describe('Give Component class', () => {
	describe('when calling parse in regex mode', () => {
		let files = ['component_simple.ts', 'component_comments.ts'];

		testFiles(files, ParseMode.Regex);
	});

	describe('when calling parse in AST mode', () => {
		let files = ['component_simple.ts', 'component_comments.ts'];

		testFiles(files, ParseMode.AST);
	});
});

function testFiles(files: string[], mode: ParseMode) {
	files.forEach((file) => {
		it(`with '${file}' file then a properly parsed component is returned`, async () => {
			let component = await Component.parse(getTestFilePath(file), mode);

			assert.equal(component.length, 1);
			assert.equal(component[0].name, 'exampleComponent');
			assert.deepEqual(component[0].bindings, [
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