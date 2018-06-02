import * as vsc from 'vscode';
import should = require('should');
import { CodeActionProvider } from '../../src/providers/codeActionsProvider';
import { MockedConfig } from '../utils/mockedConfig';
import { getTemplatesTestFilePath, getTemplatesTestDirPath } from '../utils/helpers';
import { mockRoot } from '../../src/utils/vsc';
import { Commands } from '../../src/commands/commands';
import { IComponentBase } from '../../src/utils/component/component';

const templatesRoot = getTemplatesTestDirPath();
const getConfig = () => config;
const templatePath = getTemplatesTestFilePath('testTemplate.html');

const config = new MockedConfig();
config.setMockData({ 'controller.excludedMembers': '^excluded' });

describe('Given CodeActionsProvider when calling provideCodeActions()', () => {
	let document: vsc.TextDocument;
	let provider: CodeActionProvider;

	let oldRoot: string;

	before(() => oldRoot = mockRoot(templatesRoot));
	after(() => mockRoot(oldRoot));

	beforeEach(async () => {
		document = await vsc.workspace.openTextDocument(templatePath);
		provider = new CodeActionProvider(getConfig);
	});

	it('and no diagnostic is matched then empty results are returned', () => {
		const context: vsc.CodeActionContext = {
			diagnostics: []
		};

		const result = provider.provideCodeActions(document, new vsc.Range(0, 0, 0, 0), context, undefined) as vsc.Command[];

		should(result).be.empty();
	});

	it('and only diagnostic is matched then IgnoreMember command is returned', () => {
		const range1 = new vsc.Range(0, 0, 0, 10);
		const range2 = new vsc.Range(0, 10, 0, 20);

		const context: vsc.CodeActionContext = {
			diagnostics: [<vsc.Diagnostic>{
				code: 'code1',
				range: range1
			}, <vsc.Diagnostic>{
				code: 'code2',
				range: range2
			}]
		};

		const result = provider.provideCodeActions(document, range1, context, undefined) as vsc.Command[];

		should(result).not.be.empty();
		assertIgnoreMemberCommand(result[0], 'code1');
	});

	it('and diagnostic and DidYouMean is matched then two commands are returned', () => {
		// arrange
		const range = new vsc.Range(0, 0, 0, 10);

		const context: vsc.CodeActionContext = {
			diagnostics: [<vsc.Diagnostic>{
				code: 'detials',
				range
			}]
		};

		provider.loadComponents([<IComponentBase>{
			template: { path: templatePath },
			controller: {
				getMembers: (_publicOnly: boolean) => [{ name: 'details' }]
			},
			controllerAs: 'vm',
			getBindings: () => [{name: 'binding'}]
		}]);

		// act
		const result = provider.provideCodeActions(document, range, context, undefined) as vsc.Command[];

		// assert
		should(result).be.lengthOf(2);
		assertDidYouMeanCommand(result[0], new vsc.Range(0, 3, 0, 10), 'details');
		assertIgnoreMemberCommand(result[1], 'detials');
	});
});

function assertIgnoreMemberCommand(command: vsc.Command, memberName: string) {
	should(command.command).be.equal(Commands.MemberDiagnostic.IgnoreMember);
	should(command.arguments).be.lengthOf(2);
	should(command.arguments[1]).be.equal(memberName);
}

function assertDidYouMeanCommand(command: vsc.Command, rangeToReplace: vsc.Range, match: string) {
	should(command.command).be.equal(Commands.MemberDiagnostic.DidYouMean);
	should(command.arguments).be.lengthOf(2);
	should(rangeToReplace.isEqual(command.arguments[0])).be.true();
	should(command.arguments[1]).be.equal(match);
}
