import * as path from 'path';
import * as vsc from 'vscode';
import * as should from 'should';
import sinon = require('sinon');

import { MemberCompletionProvider } from '../../src/providers/memberCompletionProvider';
import { getTemplatesTestFilePath, getTemplatesTestDirPath, createPropertyMember, createBinding } from '../utils/helpers';
import { mockRoot } from '../../src/utils/vsc';
import { IComponentBase, Component, IComponentTemplate } from '../../src/utils/component/component';
import { MockedConfig } from '../utils/mockedConfig';
import { Controller } from '../../src/utils/controller/controller';

const templatesRoot = getTemplatesTestDirPath();
const config = new MockedConfig();
const getConfig = () => config;

describe('Given MemberCompletionProvider when calling provideCompletionItems()', () => {
	let oldRoot: string;

	before(() => oldRoot = mockRoot(templatesRoot));
	after(() => mockRoot(oldRoot));

	describe('for testTemplate.html', () => {
		const provider = new MemberCompletionProvider(getConfig);
		const templatePath = getTemplatesTestFilePath('testTemplate.html');
		const cancellation = new vsc.CancellationTokenSource();

		async function testProvideCompletionItems(component: IComponentBase, position: vsc.Position) {
			const components = component && [component] || [];
			provider.loadComponents(components);

			const textDocument = await vsc.workspace.openTextDocument(templatePath);

			return provider.provideCompletionItems(textDocument, position, cancellation.token);
		}

		describe('when no components are found', () => {
			const position = new vsc.Position(0, 0);

			it('(empty components) then empty list is returned', async () => {
				// arrange, act
				const results = await testProvideCompletionItems(undefined, position);

				// assert
				should(results).be.empty();
			});

			it('(no matching component) then empty list is returned', async () => {
				// arrange
				const component = <IComponentBase>{
					template: {
						path: path.join(templatesRoot, 'different_path.html')
					}
				};

				// act
				const results = await testProvideCompletionItems(component, position);

				// assert
				should(results).be.empty();
			});
		});

		describe('when component is found', () => {
			function setupComponent(members?: string[], bindings?: string[]) {
				const controller = new Controller();
				controller.getMembers = () => (members && members.map(createPropertyMember)) || [];

				const component = new Component();
				component.getBindings = () => (bindings && bindings.map(createBinding)) || [];
				component.controller = controller;
				component.controllerAs = 'vm';
				component.template = <IComponentTemplate>{
					path: path.join(templatesRoot, 'testTemplate.html')
				};

				return { component, controller };
			}

			it('and triggering autocompletion on empty line then view model name is returned', async () => {
				// arrange
				const component = <IComponentBase>{
					controllerAs: 'vm',
					template: {
						path: path.join(templatesRoot, 'testTemplate.html')
					}
				};
				const position = new vsc.Position(1, 0);

				// act
				const results = await testProvideCompletionItems(component, position);

				// assert
				should(results).not.be.empty();
				should(results[0].label).be.equal('vm');
			});

			it('and triggering autocompletion for view model then both members and bindings are collected', async () => {
				// arrange
				config.setMockData({ 'controller.publicMembersOnly': true });

				const { component, controller } = setupComponent();
				const getMembersSpy = sinon.spy(controller, 'getMembers');
				const getBindingsSpy = sinon.spy(component, 'getBindings');
				const position = new vsc.Position(0, 3);

				// act
				const results = await testProvideCompletionItems(component, position);

				// assert
				should(results).be.empty();
				should(getMembersSpy.callCount).be.equal(1);
				should(getMembersSpy.calledWith(true)).be.true();
				should(getBindingsSpy.calledOnce).be.true();
			});

			it('and triggering autocompletion for view model then all members and bindings are returned', async () => {
				// arrange
				config.setMockData({ 'controller.excludedMembers': '^excluded' });

				const members = ['member1', 'member2', 'excludedMember', 'commonName'];
				const bindings = ['binding1', 'binding2', 'commonName'];

				const { component } = setupComponent(members, bindings);
				const position = new vsc.Position(0, 3);

				// act
				const results = await testProvideCompletionItems(component, position);

				// assert
				should(results.map(x => x.label)).be.eql(['member1', 'member2', 'commonName', 'binding1', 'binding2']);
			});
		});
	});
});
