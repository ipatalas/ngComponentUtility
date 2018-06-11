import should = require('should');
import * as vsc from 'vscode';
import * as ts from 'typescript';

import { ComponentDefinitionProvider } from '../../src/providers/componentDefinitionProvider';
import { MockedConfig } from '../utils/mockedConfig';
import { createHtmlDocument } from '../utils/helpers';
import { HtmlDocumentHelper } from '../../src/utils/htmlDocumentHelper';
import { Component, IComponentBinding } from '../../src/utils/component/component';

const config = new MockedConfig();
const getConfig = () => config;
const htmlDocumentHelper = new HtmlDocumentHelper();

describe('Given ComponentDefinitionProvider', () => {
	describe('when calling provideDefinition()', () => {
		const cancellation = new vsc.CancellationTokenSource();
		const provider = new ComponentDefinitionProvider(htmlDocumentHelper, getConfig);

		async function testProvideDefinition(component: Component, contents: string) {
			const components = component && [component] || [];
			provider.loadComponents(components);

			const { document, position } = await createHtmlDocument(contents);

			return provider.provideDefinition(document, position, cancellation.token);
		}

		it('and position is not inside a closed tag then empty array is returned', async () => {
			// arrange, act
			const results = await testProvideDefinition(undefined, '^ <component></component>');

			// assert
			should(results).be.empty();
		});

		describe('and position is inside a component tag', () => {
			const bindingPos = { line: 1, character: 1 };
			const componentsPos = { line: 2, character: 2 };
			const templatePos = { line: 3, character: 3 };
			const controllerPos = { line: 4, character: 4 };

			const component = <Component>{
				path: 'component_path.ts',
				htmlName: 'component',
				pos: componentsPos,
				bindings: [<IComponentBinding>{
					htmlName: 'binding1',
					pos: bindingPos
				}],
				template: {
					path: 'template_path.ts',
					pos: templatePos
				},
				controller: {
					path: 'controller_path.ts',
					pos: controllerPos
				}
			};

			it('but component is not found then empty array is returned', async () => {
				const results = await testProvideDefinition(undefined, '<co^mponent></component>');

				should(results).be.empty();
			});

			it(`on a binding then binding's position is returned`, async () => {
				const results = <vsc.Location>await testProvideDefinition(component, '<component ^binding1=""></component>');

				assertPosition(results.range.start, bindingPos);
			});

			it(`on binding's value then empty result is returned`, async () => {
				const results = <vsc.Location[]>await testProvideDefinition(component, '<component binding="v^alue"></component>');

				should(results).be.empty();
			});

			describe('on the component itself', () => {
				it(`and different component is found then empty result is returned`, async () => {
					const results = <vsc.Location[]>await testProvideDefinition(component, '<component></component><un^known></unknown>');

					should(results).be.empty();
				});

				it(`and goToDefinition configuration is empty then empty result is returned`, async () => {
					const results = <vsc.Location[]>await testProvideDefinition(component, '<co^mponent></component>');

					should(results).be.empty();
				});

				it(`and goToDefinition configuration is set to 'component' then component's position is returned`, async () => {
					config.setMockData({ goToDefinition: ['component'] });

					const results = <vsc.Location[]>await testProvideDefinition(component, '<co^mponent></component>');

					should(results).have.lengthOf(1);
					assertPosition(results[0].range.start, componentsPos);
				});

				it(`and goToDefinition configuration is set to 'template' then template's position is returned`, async () => {
					config.setMockData({ goToDefinition: ['template'] });

					const results = <vsc.Location[]>await testProvideDefinition(component, '<co^mponent></component>');

					should(results).have.lengthOf(1);
					assertPosition(results[0].range.start, templatePos);
				});

				it(`and goToDefinition configuration is set to 'controller' then controller's position is returned`, async () => {
					config.setMockData({ goToDefinition: ['controller'] });

					const results = <vsc.Location[]>await testProvideDefinition(component, '<co^mponent></component>');

					should(results).have.lengthOf(1);
					assertPosition(results[0].range.start, controllerPos);
				});

				it(`and goToDefinition configuration is set to all parts then all positions are returned`, async () => {
					config.setMockData({ goToDefinition: ['component', 'template', 'controller'] });

					const results = <vsc.Location[]>await testProvideDefinition(component, '<co^mponent></component>');

					should(results).have.lengthOf(3);
					assertPosition(results[0].range.start, componentsPos);
					assertPosition(results[1].range.start, templatePos);
					assertPosition(results[2].range.start, controllerPos);
				});
			});
		});
	});
});

function assertPosition(actual: vsc.Position, expected: ts.LineAndCharacter) {
	should(actual.line).be.equal(expected.line);
	should(actual.character).be.equal(expected.character);
}
