import { IMemberAccessEntry } from './streams/memberAccessParser';
import * as ts from "typescript";

export interface IHtmlTemplateInfoResults {
    htmlReferences: IHtmlReferences;
    directiveReferences: IHtmlReferences;
    templateInfo: ITemplateInfo;
}

export interface IHtmlReferences {
    [htmlName: string]: IHtmlReference[];
}

export interface IHtmlReference extends ts.LineAndCharacter {
    relativeHtmlPath: string;
}

export interface ITemplateInfo {
    [relativeHtmlPath: string]: ITemplateInfoEntry;
}

export interface ITemplateInfoEntry {
    memberAccess: IMemberAccessEntry[];
    forms: IFormInfo[];
}

export interface IFormInfo extends ts.LineAndCharacter {
    name: string;
}
