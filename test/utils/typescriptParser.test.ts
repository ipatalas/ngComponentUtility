import { getTestSourceFile } from './helpers';
import { TypescriptParser } from '../../src/utils/typescriptParser';
import should = require('should');

describe('Given TypescriptParser', () => {
	describe('when calling getExportedVariable()', () => {
		it('and variable with that name is not exported then undefined is returned', () => {
			const sourceFile = getTestSourceFile(`export let variable = 'value';`);
			const parser = new TypescriptParser(sourceFile);

			const result = parser.getExportedVariable('other_name');

			should(result).be.undefined();
		});

		it('and variable is aliased as default then the variable declaration is returned', () => {
			const sourceFile = getTestSourceFile(`const x = 'test'; export { x as default };`);
			const parser = new TypescriptParser(sourceFile);

			const result = parser.getExportedVariable('not_found');

			should(result).be.undefined();
		});

		['var', 'let', 'const'].forEach(item => {
			it(`and '${item}' is exported then variable declaration is returned`, () => {
				const sourceFile = getTestSourceFile(`export ${item} variable = 'value';`);
				const parser = new TypescriptParser(sourceFile);

				const result = parser.getExportedVariable('variable');

				should(result).not.be.undefined();
				should(result.getText()).be.equal(`variable = 'value'`);
			});

			it(`and '${item}' is exported via default export then variable declaration is returned`, () => {
				const sourceFile = getTestSourceFile(`${item} variable = 'value';
													  export default variable;`);
				const parser = new TypescriptParser(sourceFile);

				const result = parser.getExportedVariable('variable');

				should(result).not.be.undefined();
				should(result.getText()).be.equal(`variable = 'value'`);
			});

			it(`and '${item}' is exported via default export and no matching variable exists, then default is returned`, () => {
				const sourceFile = getTestSourceFile(`${item} variable = 'value';
													  export default variable;`);
				const parser = new TypescriptParser(sourceFile);

				const result = parser.getExportedVariable('nomatch');

				should(result).not.be.undefined();
				should(result.getText()).be.equal(`variable = 'value'`);
			});
		});
	});
});
