import * as vsc from 'vscode';
import * as ts from 'typescript';
import should = require('should');
import { Directive } from '../../src/utils/directive/directive';
import { DirectiveDefinitionProvider } from '../../src/providers/directiveDefinitionProvider';
import { HtmlDocumentHelper } from '../../src/utils/htmlDocumentHelper';
import { createHtmlDocument } from '../utils/helpers';
import { CancellationTokenSource } from 'vscode';

const htmlDocumentHelper = new HtmlDocumentHelper();

describe('Given DirectiveDefinitionProvider', () => {
	describe('when calling provideDefinition()', () => {
		const provider = new DirectiveDefinitionProvider(htmlDocumentHelper);
		const cancellation = new CancellationTokenSource();

		async function testProvideDefinition(directives: Directive[], contents: string) {
			provider.loadDirectives(directives || []);

			const { document, position } = await createHtmlDocument(contents);

			return provider.provideDefinition(document, position, cancellation.token);
		}

		it('and position is outside a closed tag then empty array is returned', async () => {
			// arrange, act
			const results = await testProvideDefinition(undefined, '^ <component></component>');

			// assert
			should(results).be.empty();
		});

		describe('and when position is on', () => {
			const directivePos = { line: 2, character: 2 };
			const directives = [<Directive>{
				className: 'DirectiveName',
				htmlName: 'directive-name',
				name: 'Directive',
				path: 'path',
				pos: directivePos
			}, <Directive>{
				className: 'OtherDirective',
				htmlName: 'other-directive',
				name: 'OtherDirective',
				path: 'wrong path',
				pos: { line: 1, character: 1 }
			}];

			it(`an element directive then directive's position is returned`, async () => {
				// arrange, act
				const result = <vsc.Location>await testProvideDefinition(directives, '<^directive-name></directive-name>');

				// assert
				assertPosition(result.range.start, directivePos);
			});

			it(`an attribute directive then directive's position is returned`, async () => {
				// arrange, act
				const result = <vsc.Location>await testProvideDefinition(directives, '<element ^directive-name></element>');

				// assert
				assertPosition(result.range.start, directivePos);
			});

			it(`on non-directive attribute then empty array is returned`, async () => {
				// arrange, act
				const results = await testProvideDefinition(directives, '<element directive-name ^attribute=""></element>');

				// assert
				should(results).be.empty();
			});
		});
	});
});

function assertPosition(actual: vsc.Position, expected: ts.LineAndCharacter) {
	should(actual.line).be.equal(expected.line);
	should(actual.character).be.equal(expected.character);
}
