import * as assert from 'assert';
import * as path from 'path';
import { Component, IComponentBinding } from '../../src/utils/component';

const TEST_FILES_ROOT = path.join(__dirname, '../../../test/test_files');

var getTestFilePath = (filename: string) => path.join(TEST_FILES_ROOT, filename);

describe('Give Component class', () => {
	describe('when calling parse', () => {
		let files = ['component_simple.ts', 'component_comments.ts'];

		files.forEach((file) => {
			it(`with '${file}' component file then a parsed component is returned`, async () => {
				let component = await Component.parse(getTestFilePath(file));

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
		})
	});
});
