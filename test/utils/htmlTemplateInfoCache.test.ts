import * as assert from 'assert';
import proxyquire = require('proxyquire');

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
				'test-component': {
					path: [{
						line: 10,
						col: 12
					}]
				}
			};

			const template = {
				path: 'path',
				pos: { line: 10, character: 10 },
				body: '<test-component></test-component>'
			};

			// act
			const result = await sut.loadInlineTemplates([template]);

			// assert
			assert.deepEqual(result, expectedResult);
		});
	});
});
