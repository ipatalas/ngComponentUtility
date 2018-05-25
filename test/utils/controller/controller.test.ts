import * as assert from 'assert';
import * as _ from 'lodash';

import { Controller } from '../../../src/utils/controller/controller';
import { MemberBase, MemberType, IMember } from '../../../src/utils/controller/member';
import { ClassMethod } from '../../../src/utils/controller/method';
import { getControllerSourceFile } from '../helpers';
import should = require('should');
import sinon = require('sinon');

describe('Given Controller class', () => {
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

	describe('when calling isInstanceOf()', () => {
		it('and controller is direct instance of given class then true is returned', () => {
			const controller = new Controller();
			controller.className = 'TestClass';

			const result = controller.isInstanceOf('TestClass');

			should(result).be.true();
		});

		it('and controller is not instance of given class then false is returned', () => {
			const controller = new Controller();
			controller.className = 'TestClass';

			const result = controller.isInstanceOf('OtherTestClass');

			should(result).be.false();
		});

		it('and controller base class is instance of given class then isInstanceOf base class is called', () => {
			// arrange
			const TESTED_CLASS = 'OtherTestClass';
			const baseClass = new Controller();
			baseClass.isInstanceOf = () => true;
			const spy = sinon.spy(baseClass, 'isInstanceOf');

			const controller = new Controller();
			controller.className = 'TestClass';
			controller.baseClass = baseClass;

			// act
			const result = controller.isInstanceOf(TESTED_CLASS);

			// assert
			should(result).be.equal(true);
			should(spy.calledOnce).be.true();
		});
	});

	describe('when calling getMembers()', () => {
		let controller: Controller;

		beforeEach(() => {
			const baseController = new Controller();
			baseController.members = [<IMember>{
				isPublic: true
			}, <IMember>{
				isPublic: false
			}];

			controller = new Controller();
			controller.members = [<IMember>{
				isPublic: true
			}, <IMember>{
				isPublic: false
			}];

			controller.baseClass = baseController;
		});

		it('with `true` then only public members are returned', () => {
			const result = controller.getMembers(true);

			should(result).have.lengthOf(2);
		});

		it('with `false` then all members are returned', () => {
			const result = controller.getMembers(false);

			should(result).have.lengthOf(4);
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
