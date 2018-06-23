import * as assert from 'assert';
import * as _ from 'lodash';
import proxyquire = require('proxyquire');
import { IHtmlTemplateInfoResults } from '../../src/utils/htmlTemplate/types';
import { Route } from '../../src/utils/route/route';

class MockedRelativePath {
	public relative: string;

	constructor(p: string) {
		this.relative = p;
	}
}

const { HtmlTemplateInfoCache } = proxyquire('../../src/utils/htmlTemplate/htmlTemplateInfoCache', {
	'./relativePath': { RelativePath: MockedRelativePath }
});

describe('Given HtmlTemplateInfoCache class', () => {
	describe('when calling loadInlineTemplates', () => {
		it('then html references should be set', async () => {
			// arrange
			const sut = new HtmlTemplateInfoCache();

			const expectedResult = {
				'test-component': [{
					col: 12,
					line: 10,
					relativeHtmlPath: 'path'
				}]
			};

			const template = {
				path: 'path',
				pos: { line: 10, character: 10 },
				body: '<test-component></test-component>'
			};

			// act
			const result: IHtmlTemplateInfoResults = await sut.loadInlineTemplates([template]);

			// assert
			assert.deepEqual(result.htmlReferences, expectedResult);
		});

		it('then html references should be set for routes', async () => {
			// arrange
			const sut = new HtmlTemplateInfoCache();

			const expectedResult = {
				'inline-component': [{
					col: 27,
					line: 6,
					relativeHtmlPath: 'path'
				}]
			};

			const route: Route = new Route();

			route.name = 'example_route';
			route.pos = {
				line: 4,
				character: 13
			};
			route.path = 'path';
			route.views = [];

			const inlineComponent = new Route();
			inlineComponent.name = 'inline-component';
			inlineComponent.pos = {
				line: 6,
				character: 24
			};
			inlineComponent.path = 'path';
			inlineComponent.template = {
				path: 'path',
				pos: {
					line: 6,
					character: 25
				},
				body: '<inline-component></inline-component>'
			};
			route.views.push(inlineComponent);

			const routes = _.flatMap([route], (c) => {
				if (c.template && c.template.body) {
					return c.template;
				}

				if (c.views && c.views.length > 0) {
					return c.views.filter(v => v.template && v.template.body).map(v => v.template);
				}
			});

			// act
			const result: IHtmlTemplateInfoResults = await sut.loadInlineTemplates(routes);

			// assert
			assert.deepEqual(result.htmlReferences, expectedResult);
		});
	});
});
