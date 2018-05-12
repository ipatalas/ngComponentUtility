import _ = require('lodash');
import * as ts from 'typescript';
import * as parse5 from 'parse5';

import { IHtmlTemplateInfoResults, IHtmlReferences, ITemplateInfo } from './types';
import { IMemberAccessEntry } from './streams/memberAccessParser';

export class HtmlTemplateInfoResults implements IHtmlTemplateInfoResults {
	public htmlReferences: IHtmlReferences = {};
	public templateInfo: ITemplateInfo = {};

	public addHtmlReference = (componentName: string, relativeHtmlPath: string, location: ts.LineAndCharacter) => {
		this.htmlReferences[componentName] = this.htmlReferences[componentName] || [];
		this.htmlReferences[componentName].push({
			relativeHtmlPath,
			...location
		});
	}

	public addFormName = (relativeHtmlPath: string, formName: string, location: parse5.MarkupData.Location) => {
		this.initTemplateInfo(relativeHtmlPath);
		this.templateInfo[relativeHtmlPath].forms.push({
			name: formName,
			line: location.line - 1,
			character: location.col - 1
		});
	}

	public addMemberAccess = (relativeHtmlPath: string, memberAccess: IMemberAccessEntry) => {
		this.initTemplateInfo(relativeHtmlPath);
		this.templateInfo[relativeHtmlPath].memberAccess.push(memberAccess);
	}

	public deleteTemplate = (relativePath: string) => {
        const emptyKeys = [];

        _.forIn(this.htmlReferences, (value, key) => {
            delete value[relativePath];

            if (_.isEmpty(value)) {
                emptyKeys.push(key);
            }
        });

        delete this.templateInfo[relativePath];

        emptyKeys.forEach(key => delete this.htmlReferences[key]);
    }

	private initTemplateInfo(relativeHtmlPath: string) {
		this.templateInfo[relativeHtmlPath] = this.templateInfo[relativeHtmlPath] || {
			forms: [],
			memberAccess: []
		};
	}
}
