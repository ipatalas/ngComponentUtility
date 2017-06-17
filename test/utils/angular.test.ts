import * as assert from 'assert';
import * as path from 'path';
import { isValidAngularProject } from '../../src/utils/angular';

const TEST_FILES_ROOT = path.join(__dirname, '../../../test/test_files/angular');

const getTestProjectPath = (filename: string) => path.join(TEST_FILES_ROOT, filename);

describe('Given isAngularProject ', () => {
	describe('when calling', () => {
		it('with WebPack project then Angular should be detected', () => assertProject('webpack', true));
		it('with Bower project then Angular should be detected', () => assertProject('bower', true));
		it('with JSPM project then Angular should be detected', () => assertProject('jspm1', true));
		it('with JSPM project #2 then Angular should be detected', () => assertProject('jspm2', true));
		it('with project with out-dated Angular then Angular should NOT be detected', () => assertProject('angular_version_too_low', false));
		it('with project with Angular 2 then Angular should NOT be detected', () => assertProject('angular_version_too_high', false));
	});
});

function assertProject(projectName: string, expected: boolean) {
	const root = getTestProjectPath(projectName);

	const result = isValidAngularProject(root);

	assert.equal(result, expected);
}
