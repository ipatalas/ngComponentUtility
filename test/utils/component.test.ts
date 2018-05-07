import * as assert from 'assert';
import * as _ from 'lodash';

import { Component, IComponentBinding } from '../../src/utils/component/component';
import { getComponentSourceFile, getComponentsTestFilePath } from './helpers';

describe('Give Component class', () => {
	describe('when calling parse in AST mode', () => {
		const files = ['component_simple.ts', 'component_comments.ts', 'test.component.js', 'component_consts.ts', 'component_staticFields.ts'];

		testFiles(files);

		it('and controllerAs property exists then controller alias is set', async () => {
			const sourceFile = getComponentSourceFile('component_ctrlAlias.ts');

			const component = await Component.parse(sourceFile, [<any>{name: 'TestController'}]);

			assert.equal(component[0].controllerAs, 'vm');
		});

		it('and controllerAs property does not exist then default controller alias is set', async () => {
			const sourceFile = getComponentSourceFile('component_noCtrlAlias.ts');

			const component = await Component.parse(sourceFile, [<any>{name: 'TestController'}]);

			assert.equal(component[0].controllerAs, '$ctrl');
		});

		it('with component_importLiteral.ts file then a properly parsed component is returned', async () => {
			const sourceFile = getComponentSourceFile('component_importLiteral.ts');

			const components = await Component.parse(sourceFile, []);

			assertComponents(components);
		});

		it('with component_importClass.ts file then a properly parsed component is returned', async () => {
			const sourceFile = getComponentSourceFile('component_importClass.ts');

			const components = await Component.parse(sourceFile, []);

			assertComponents(components);
		});

		it('with component_class.ts file then a properly parsed component is returned', async () => {
			const sourceFile = getComponentSourceFile('component_class.ts');

			const components = await Component.parse(sourceFile, []);

			assertComponents(components);
		});

		it('with component_literal.ts file then a properly parsed component is returned', async () => {
			const sourceFile = getComponentSourceFile('component_literal.ts');

			const components = await Component.parse(sourceFile, []);

			assertComponents(components);
		});

		it('with component_importReexportedLiteral.ts file then a properly parsed component is returned', async () => {
			const sourceFile = getComponentSourceFile('component_importReexportedLiteral.ts');

			const components = await Component.parse(sourceFile, []);

			assertComponents(components);
		});

		it('with component_importReexportedClass.ts file then a properly parsed component is returned', async () => {
			const sourceFile = getComponentSourceFile('component_importReexportedClass.ts');

			const components = await Component.parse(sourceFile, []);

			assertComponents(components);
		});

		it('with component_required_template.ts file then a properly parsed component is returned', async () => {
			const sourceFile = getComponentSourceFile('component_required_template.ts');

			const components = await Component.parse(sourceFile, []);

			const expectedTemplatePath = getComponentsTestFilePath('template.html');
			assert.equal(components[0].template.path, expectedTemplatePath);
		});

		it('with component_inline_template.ts file then template body is assigned to component', async () => {
			const sourceFile = getComponentSourceFile('component_inline_template.ts');

			const components = await Component.parse(sourceFile, []);

			const expectedTemplateBody = '<b>inlineTemplateBody</b>';
			assert.equal(components[0].template.body, expectedTemplateBody);
		});

		it('with component_constructor_init.ts file then a properly parsed component is returned', async () => {
			const sourceFile = getComponentSourceFile('component_constructor_init.ts');

			const components = await Component.parse(sourceFile, []);

			const expectedTemplatePath = getComponentsTestFilePath('example-template.html');
			assert.equal(components[0].template.path, expectedTemplatePath);
		});
	});
});

function assertComponents(components: Component[], names?: string[]) {
	const expectedComponentsCount = (names && names.length) || 1;

	assert.equal(components.length, expectedComponentsCount);
	for (let i = 0; i < expectedComponentsCount; i++) {
		assert.equal(components[i].name, (names && names[i]) || 'exampleComponent');
		assert.equal(components[i].bindings.length, 1);
		assert.equal(components[i].bindings[0].name, 'exampleBinding');
		assert.equal(components[i].bindings[0].type, '<');
	}
}

function testFiles(files: string[]) {
	files.forEach((file) => {
		it(`with '${file}' file then a properly parsed component is returned`, async () => {
			const sourceFile = getComponentSourceFile(file);

			const component = await Component.parse(sourceFile, []);

			assert.equal(component.length, 1);
			assert.equal(component[0].name, 'exampleComponent');
			const bindings = component[0].bindings.map(b => _.pick(b, ['name', 'htmlName', 'type']));
			assert.deepEqual(bindings, [
				{
					name: 'config',
					htmlName: 'config',
					type: '<'
				} as IComponentBinding,
				{
					name: 'data',
					htmlName: 'data',
					type: '<'
				} as IComponentBinding
			]);
		});
	});
}
