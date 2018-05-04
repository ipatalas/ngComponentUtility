import { HtmlTemplateInfoCache } from '../../src/utils/htmlTemplate/htmlTemplateInfoCache';
import * as assert from 'assert';
import _ = require('lodash');

describe('Given HtmlTemplateInfoCache class', () => {
	describe('when calling loadInlineTemplates', () => {
		it('then html references should be set', async () => {
			const sut = new HtmlTemplateInfoCache();

			const result = await sut.loadInlineTemplates([{ path: 'path', pos: { line: 10, character: 10 }, body: '<test-component></test-component>' }]);

			assert(result['test-component']);
			assert(result['test-component']['path']);
			assert(result['test-component']['path'].length === 1);
			assert(_.isEqual(result['test-component']['path'][0], { line: 10, col: 12 }));
		});
	});
});
