import * as vsc from 'vscode';
import should = require('should');
import { ComponentCompletionProvider } from '../../src/providers/componentCompletionProvider';
import { HtmlDocumentHelper } from '../../src/utils/htmlDocumentHelper';
import { Component } from '../../src/utils/component/component';
import { createHtmlDocument } from '../utils/helpers';

const htmlDocumentHelper = new HtmlDocumentHelper();

describe('Given ComponentCompletionProvider when calling provideCompletionItems()', () => {
	let provider: ComponentCompletionProvider;

	beforeEach(async () => {
		provider = new ComponentCompletionProvider(htmlDocumentHelper);
	});

	['</^closing-tag>', '</closing-tag^>'].forEach(contents => {
		it(`on a closing tag (${contents}) then empty result is returned`, async () => {
			const { document, position } = await createHtmlDocument(contents);

			const result = provider.provideCompletionItems(document, position, undefined);

			should(result).be.empty();
		});
	});

	['<^', '<div>^</div>', '<div></div><^'].forEach(contents => {
		it(`on an opening tag (${contents}) then all components are returned`, async () => {
			const { document, position } = await createHtmlDocument(contents);
			provider.loadComponents([
				<Component>{ htmlName: 'component-one', bindings: [] },
				<Component>{ htmlName: 'component-two', bindings: [] }
			]);

			const result = provider.provideCompletionItems(document, position, undefined);

			should(result).be.lengthOf(2);
			should(result.map(r => r.label)).be.eql(['component-one', 'component-two']);
		});
	});

	it(`on an opening tag then properly built CompletionItem is returned`, async () => {
		const { document, position } = await createHtmlDocument('<^');
		provider.loadComponents([<Component>{
			htmlName: 'component-one', bindings: [
				{ htmlName: 'one', type: '<' },
				{ htmlName: 'two', type: '=' },
			]
		}]);

		const [result] = provider.provideCompletionItems(document, position, undefined);

		should(result).be.not.undefined();
		should(result.insertText).be.equal('<component-one one="" two=""></component-one>');
		should(result.label).be.equal('component-one');
		should(result.kind).be.equal(vsc.CompletionItemKind.Class);
		should(result.documentation).containEql('Component bindings:');
		should(result.documentation).containEql('one: <');
		should(result.documentation).containEql('two: =');
	});

	it(`inside an unknown component tag then empty result is returned`, async () => {
		const { document, position } = await createHtmlDocument('<unknown ^></unknown>');
		provider.loadComponents([
			<Component>{
				htmlName: 'alpha', bindings: [
					{ htmlName: 'binding-1' },
					{ htmlName: 'binding-2' },
				]
			}
		]);

		const result = provider.provideCompletionItems(document, position, undefined);

		should(result).be.empty();
	});

	it(`inside a component tag then all bindings are returned`, async () => {
		const { document, position } = await createHtmlDocument('<alpha ^></alpha>');
		provider.loadComponents([
			<Component>{
				htmlName: 'alpha', bindings: [
					{ htmlName: 'binding-1' },
					{ htmlName: 'binding-2' },
				]
			}
		]);

		const result = provider.provideCompletionItems(document, position, undefined);

		should(result).be.lengthOf(2);
		should(result.map(r => r.label.trimLeft())).be.eql(['binding-1', 'binding-2']);
	});
});
