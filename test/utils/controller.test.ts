import * as assert from 'assert';
import * as _ from 'lodash';

import { Controller } from '../../src/utils/controller/controller';
import { MemberBase, MemberType } from '../../src/utils/controller/member';
import { ClassMethod } from '../../src/utils/controller/method';
import { getControllerSourceFile } from './helpers';

describe('Give Controller class', () => {
	describe('when calling parse', () => {
		const testCases = [{
			test_file: 'controller_simple.ts',
			expected_results: [{
				className: 'TestController',
				name: 'TestController'
			}]
		}, {
			test_file: 'controller_differentName.ts',
			expected_results: [{
				className: 'TestController',
				name: 'differentName'
			}]
		}, {
			test_file: 'controller_multiple.ts',
			expected_results: [{
				className: 'TestController',
				name: '1'
			}, {
				className: 'TestController2',
				name: '2'
			}]
		}, {
			test_file: 'controller_multiple_ignored.ts',
			expected_results: [{
				className: 'TestController',
				name: 'TestController'
			}]
		}, {
			test_file: 'controller_chained.ts',
			expected_results: [1, 2, 3].map(i => ({
				className: `TestController${i}`,
				name: `TestController${i}`
			}))
		}];

		testFiles(testCases);

		it('with controller with members then all members are properly parsed', async () => {
			const sourceFile = getControllerSourceFile('controller_members.ts');

			const ctrl = (await Controller.parse(sourceFile))[0];

			const members = ctrl.members.map(m => <MemberBase>m);

			assertField(members, 'privateField', 'string', false);
			assertField(members, 'publicField', 'string', true);
			assertField(members, 'implicitlyPublicField', 'string', true);
			assertField(members, 'customType', 'IReturnType', true);

			assertMethod(members, 'testMethod', 'number', true, [{ name: 'p1', type: 'string' }]);
			assertMethod(members, 'arrowFunction', 'number', true, [{ name: 'p1', type: 'string' }, { name: 'p2', type: 'number' }]);
		});
	});
});

const assertField = (members: MemberBase[], name: string, returnType: string, isPublic: boolean) => {
	assertMember(members, name, MemberType.Property, returnType, isPublic);
};

const assertMethod = (members: MemberBase[], name: string, returnType: string, isPublic: boolean, params?: Array<{ name: string, type: string }>) => {
	const member = <ClassMethod>assertMember(members, name, MemberType.Method, returnType, isPublic);

	if (params) {
		assert.deepEqual(member.parameters, params);
	}
};

function assertMember(members: MemberBase[], name: string, type: MemberType, returnType: string, isPublic: boolean) {
	const member = members.find(m => m.name === name);
	assert.notEqual(member, undefined, `Cannot find member '${name}'`);

	assert.equal(member.type, type, `type for field '${name}' does not match`);
	assert.equal(member.returnType, returnType, `returnType for field '${name}' does not match`);
	assert.equal(member.isPublic, isPublic, `isPublic for field '${name}' does not match`);

	return member;
}

function testFiles(cases: Array<{ test_file: string, expected_results: Array<{ className: string, name: string }> }>) {
	cases.forEach(test => {
		it(`with '${test.test_file}' file then a properly parsed controller is returned`, async () => {
			const sourceFile = getControllerSourceFile(test.test_file);

			const controllers = await Controller.parse(sourceFile);

			assert.equal(controllers.length, test.expected_results.length);

			const results = controllers.map(b => _.pick(b, ['className', 'name']));

			assert.deepEqual(results, test.expected_results);
		});
	});
}
