import * as assert from 'assert';
import * as path from 'path';
import * as ts from "typescript";
import * as fs from 'fs';
import * as _ from 'lodash';

import { Component, IComponentBinding } from '../../src/utils/component/component';

const TEST_FILES_ROOT = path.join(__dirname, '../../../test/test_files');

const getTestFilePath = (filename: string) => path.join(TEST_FILES_ROOT, filename);

describe('Give Component class', () => {
	describe('when calling parse in AST mode', () => {
		const files = ['component_simple.ts', 'component_comments.ts', 'test.component.js', 'component_consts.ts', 'component_staticFields.ts'];

		testFiles(files);

		it('and controllerAs property exists then controller alias is set', async () => {
			const path = getTestFilePath('component_ctrlAlias.ts');
			const sourceFile = ts.createSourceFile('component_ctrlAlias.ts', fs.readFileSync(path, 'utf8'), ts.ScriptTarget.ES5, true);

			const component = await Component.parse({ path, sourceFile }, []);

			assert.equal(component[0].controllerAs, 'vm');
		});

		it('and controllerAs property does not exist then default controller alias is set', async () => {
			const path = getTestFilePath('component_noCtrlAlias.ts');
			const sourceFile = ts.createSourceFile('component_noCtrlAlias.ts', fs.readFileSync(path, 'utf8'), ts.ScriptTarget.ES5, true);

			const component = await Component.parse({ path, sourceFile }, []);

			assert.equal(component[0].controllerAs, '$ctrl');
		});

		it('with component_importLiteral.ts file then a properly parsed component is returned', async () => {
			const path = getTestFilePath('component_importLiteral.ts');
			const sourceFile = ts.createSourceFile('component_importLiteral.ts', fs.readFileSync(path, 'utf8'), ts.ScriptTarget.ES5, true);

			const component = await Component.parse({ path, sourceFile }, []);

			assert.equal(component.length, 1);
			assert.equal(component[0].name, 'exampleComponent');
			assert.equal(component[0].bindings.length, 1);
			assert.equal(component[0].bindings[0].name, 'exampleBinding');
			assert.equal(component[0].bindings[0].type, '<');
		});
	});
});

function testFiles(files: string[]) {
	files.forEach((file) => {
		it(`with '${file}' file then a properly parsed component is returned`, async () => {
			const path = getTestFilePath(file);
			const sourceFile = ts.createSourceFile(file, fs.readFileSync(path, 'utf8'), ts.ScriptTarget.ES5, true);

			const component = await Component.parse({ path, sourceFile }, []);

			assert.equal(component.length, 1);
			assert.equal(component[0].name, 'exampleComponent');
			const bindings = component[0].bindings.map(b => _.pick(b, ['name', 'htmlName', 'type']));
			assert.deepEqual(bindings, [
				{
					name: "config",
					htmlName: "config",
					type: "<"
				} as IComponentBinding,
				{
					name: "data",
					htmlName: "data",
					type: "<"
				} as IComponentBinding
			]);
		});
	});
}
