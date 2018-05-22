import { getRouteSourceFile } from './helpers';
import { Route } from '../../src/utils/route/route';
import * as assert from 'assert';
import * as path from 'path';
import { mockRoot } from '../../src/utils/vsc';

describe('Given Route class', () => {
	describe('when calling parse()', () => {
		it('on route with inline template then template is set correctly', async () => {
			const sourceFile = getRouteSourceFile('route.inline_template.ts');

			const [route] = await Route.parse(sourceFile, []);

			assert.equal(route.path, sourceFile.path);
			assert.equal(route.name, 'example_route');
			assert.equal(route.template.body, 'Route inline template');
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
