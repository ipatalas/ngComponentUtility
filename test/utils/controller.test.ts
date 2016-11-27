import * as assert from 'assert';
import * as path from 'path';
import * as ts from "typescript";
import * as fs from 'fs';
import * as _ from 'lodash';

import { Controller } from '../../src/utils/controller';

const TEST_FILES_ROOT = path.join(__dirname, '../../../test/test_files');

const getTestFilePath = (filename: string) => path.join(TEST_FILES_ROOT, filename);

describe('Give Controller class', () => {
	describe('when calling parse', () => {
		const testCases = [{
			test_file: 'controller_simple.ts',
			expected_results: [{
				className: "TestController",
				name: "TestController"
			}]
		}, {
			test_file: 'controller_differentName.ts',
			expected_results: [{
				className: "TestController",
				name: "differentName"
			}]
		}, {
			test_file: 'controller_multiple.ts',
			expected_results: [{
				className: "TestController",
				name: "1"
			}, {
				className: "TestController2",
				name: "2"
			}]
		}];

		testFiles(testCases);
	});
});

function testFiles(cases: Array<{ test_file: string, expected_results: Array<{ className: string, name: string }> }>) {
	cases.forEach(test => {
		it(`with '${test.test_file}' file then a properly parsed controller is returned`, async () => {
			let path = getTestFilePath(test.test_file);
			let sourceFile = ts.createSourceFile(test.test_file, fs.readFileSync(path, 'utf8'), ts.ScriptTarget.ES5, true);

			let controllers = await Controller.parse({ path, sourceFile });

			assert.equal(controllers.length, test.expected_results.length);

			let results = controllers.map(b => _.pick(b, ['className', 'name']));

			assert.deepEqual(results, test.expected_results);
		});
	});
}
