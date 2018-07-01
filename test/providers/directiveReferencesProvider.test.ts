import * as vsc from 'vscode';
import * as ts from 'typescript';
import { DirectiveReferencesProvider } from '../../src/providers/directiveReferencesProvider';
import { Directive } from '../../src/utils/directive/directive';
import { createTypescriptDocument } from '../utils/helpers';
import should = require('should');
import { IHtmlReferences } from '../../src/utils/htmlTemplate/types';
import { mockRoot } from '../../src/utils/vsc';

describe('Given DirectiveReferencesProvider', () => {
	describe('when calling provideReferences()', () => {
		const provider = new DirectiveReferencesProvider();
		const cancellation = new vsc.CancellationTokenSource();

		async function testProvideReferences(directives: Directive[], references: IHtmlReferences, contents: string) {
			provider.load(references || {}, directives || []);

			const { document, position } = await createTypescriptDocument(contents);

			return provider.provideReferences(document, position, { includeDeclaration: false }, cancellation.token);
		}

		it('and there are no directives then empty array is returned', async () => {
			// arrange, act
			const results = await testProvideReferences(null, null, '^directive');

			// assert
			should(results).be.empty();
		});

		describe('with existing directives', () => {
			const directives = [<Directive>{
				className: 'DirectiveClassName',
				htmlName: 'directive-name',
				name: 'Directive',
			}, <Directive>{
				className: 'OtherDirective',
				htmlName: 'other-directive',
				name: 'OtherDirective'
			}];

			const firstLocation = { character: 1, line: 1 };
			const secondLocation = { character: 2, line: 2 };
			const references = <IHtmlReferences>{
				'directive-name': [
					{ relativeHtmlPath: 'test.html', ...firstLocation },
					{ relativeHtmlPath: 'test2.html', ...secondLocation }
				]
			};

			let oldRoot: string;

			before(() => oldRoot = mockRoot('root'));
			after(() => mockRoot(oldRoot));

			it('and non existing directive is searched then empty array is returned', async () => {
				// arrange, act
				const results = await testProvideReferences(directives, null, '^non-existing-directive');

				// assert
				should(results).be.empty();
			});

			it('and existing directive is searched but no references are found then empty array is returned', async () => {
				// arrange, act
				const results = await testProvideReferences(directives, references, '^OtherDirective');

				// assert
				should(results).be.empty();
			});

			[
				{ contents: '^DirectiveClassName', by: 'class name' },
				{ contents: '^Directive', by: 'registraiton name' }
			].forEach(item => {
				it(`and existing directive with references is searched by ${item.by} then proper results are returned`, async () => {
					// arrange, act
					const results = await testProvideReferences(directives, references, item.contents);

					// assert
					should(results).be.lengthOf(2);
					assertReference(results[0], '/root/test.html', firstLocation);
					assertReference(results[1], '/root/test2.html', secondLocation);
				});
			});
		});
	});
});

function assertReference(actual: vsc.Location, expectedPath: string, expectedPos: ts.LineAndCharacter) {
	should(actual.uri.path).be.equal(expectedPath);
	should(actual.range.start.line).be.equal(expectedPos.line);
	should(actual.range.start.character).be.equal(expectedPos.character);
}
