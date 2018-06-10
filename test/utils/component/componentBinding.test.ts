import * as ts from 'typescript';
import { getTestSourceFile } from '../helpers';
import { TypescriptParser } from '../../../src/utils/typescriptParser';
import { ComponentBinding } from '../../../src/utils/component/componentBinding';
import should = require('should');
import _ = require('lodash');

describe('Given ComponentBinding', () => {
	it('when constructing fields are properly filled', () => {
		// arrange
		const contents = '({bindingName: \'<\'})';
		const sourceFile = getTestSourceFile(contents);
		const parser = new TypescriptParser(sourceFile);

		const node = parser.findNode(3);
		const assignment = parser.closestParent<ts.PropertyAssignment>(node, ts.SyntaxKind.PropertyAssignment);

		// act
		const result = new ComponentBinding(assignment, parser);

		// assert
		should(_.pick(result, 'name', 'htmlName', 'type')).be.eql({
			name: 'bindingName',
			htmlName: 'binding-name',
			type: '<'
		});
	});
});
