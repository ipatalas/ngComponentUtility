import { getDirectiveSourceFile } from '../helpers';
import { Directive } from '../../../src/utils/directive/directive';
import should = require('should');

describe('Given Directive class when calling parse()', () => {
	it('with class based directive then the directive is properly parsed', async () => {
		const sourceFile = getDirectiveSourceFile('directive.init.class_property.ts');

		const results = await Directive.parse(sourceFile);

		should(results).be.lengthOf(1);
		const directive = results[0];
		should(directive.name).be.equal('classDirective');
		should(directive.htmlName).be.equal('class-directive');
		should(directive.restrict).be.equal('E');
	});

	it('with constructor initialized class based directive then the directive is properly parsed', async () => {
		const sourceFile = getDirectiveSourceFile('directive.init.class_ctor.ts');

		const results = await Directive.parse(sourceFile);

		should(results).be.lengthOf(1);
		const directive = results[0];
		should(directive.name).be.equal('classDirective');
		should(directive.htmlName).be.equal('class-directive');
		should(directive.restrict).be.equal('E');
	});

	it(`with directive without explicit 'restrict' then the it is set to default 'EA'`, async () => {
		const sourceFile = getDirectiveSourceFile('directive.default_restrict.ts');

		const results = await Directive.parse(sourceFile);

		should(results).be.lengthOf(1);
		should(results[0].restrict).be.equal('EA');
	});

	[
		'directive.register.arrowFunc.ts',
		'directive.register.blockArrowFunc.ts',
		'directive.register.functionExpression.ts'
	].forEach(filename => {
		it(`with directive initialized (${filename}) then the directive is parsed`, async () => {
			const sourceFile = getDirectiveSourceFile(filename);

			const results = await Directive.parse(sourceFile);

			should(results).be.lengthOf(1);
			should(results[0].restrict).be.equal('EA');
		});
	});

	[
		'directive.function.ts',
		'directive.function.named.ts',
		'directive.function.named.arrow.ts',
		'directive.function.arrow.ts',
		'directive.function.arrow.returnExpression.ts',
		'directive.function.injectedParams.ts'
	].forEach(filename => {
		it(`with function based directive (${filename}) then the directive is parsed`, async () => {
			const sourceFile = getDirectiveSourceFile(filename);

			const results = await Directive.parse(sourceFile);

			should(results).be.lengthOf(1);
			should(results[0].restrict).be.equal('E');
		});
	});

	it('with multiple directives then all directives are properly parsed', async () => {
		const sourceFile = getDirectiveSourceFile('directive.multiple.ts');

		const results = await Directive.parse(sourceFile);

		should(results).be.lengthOf(3);
		for (const i of [1, 2, 3]) {
			should(results[i - 1].name).be.equal('classDirective' + i);
			should(results[i - 1].className).be.equal('ClassDirective' + i);
		}
	});
});
