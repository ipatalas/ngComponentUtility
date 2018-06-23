import { getRouteSourceFile } from './helpers';
import { Route } from '../../src/utils/route/route';
import * as assert from 'assert';
import * as path from 'path';
import { mockRoot } from '../../src/utils/vsc';

describe('Given Route class', () => {
	describe('when calling parse()', () => {
		it('on route with views then templates are set correctly', async () => {
			mockRoot('testRoot');
			const sourceFile = getRouteSourceFile('route.views_template.ts');

			const [route] = await Route.parse(sourceFile, []);

			assert.equal(route.path, sourceFile.path);
			assert.equal((route.views[0] as Route).template.body, '<inline-component></inline-component>');
			assert.equal((route.views[1] as Route).template.body, 'inline-template');
			assert.equal((route.views[2] as Route).template.path, path.normalize('testRoot/subdir/template.html'));
			assert.equal((route.views[3] as Route).template.body, '<template-component></template-component>');
		});

		it('on route with inline template then template is set correctly', async () => {
			const sourceFile = getRouteSourceFile('route.inline_template.ts');

			const [route] = await Route.parse(sourceFile, []);

			assert.equal(route.path, sourceFile.path);
			assert.equal(route.name, 'example_route');
			assert.equal(route.template.body, 'Route inline template');
			assert.equal(route.template.path, sourceFile.path);
		});

		it('on route with component and no template then template is set correctly', async () => {
			const sourceFile = getRouteSourceFile('route.component_template.ts');

			const [route] = await Route.parse(sourceFile, []);

			assert.equal(route.path, sourceFile.path);
			assert.equal(route.name, 'example_route');
			assert.equal(route.template.body, '<component-name></component-name>');
			assert.equal(route.template.path, sourceFile.path);
		});

		it('on route with external template then template is set correctly', async () => {
			mockRoot('testRoot');
			const sourceFile = getRouteSourceFile('route.external_template.ts');

			const [route] = await Route.parse(sourceFile, []);

			assert.equal(route.path, sourceFile.path);
			assert.equal(route.name, 'example_route');
			assert.equal(route.template.path, path.normalize('testRoot/subdir/template.html'));
		});

		it('on route with required template then template is set correctly', async () => {
			const sourceFile = getRouteSourceFile('route.required_template.ts');

			const [route] = await Route.parse(sourceFile, []);

			assert.equal(route.path, sourceFile.path);
			assert.equal(route.name, 'example_route');
			assert.equal(route.template.path, path.join(path.dirname(sourceFile.path), 'subdir/template.html'));
		});
	});
});
