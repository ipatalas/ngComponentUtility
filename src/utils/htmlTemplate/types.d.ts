import { IMemberAccessEntry } from './streams/memberAccessParser';
import * as ts from "typescript";

export interface IHtmlTemplateInfoResults {
    htmlReferences: IHtmlReferences;
    templateInfo: ITemplateInfo;
}

export interface IHtmlReferences {
    [componentName: string]: IComponentReferences[];
}

export interface IComponentReferences extends ts.LineAndCharacter {
    relativeHtmlPath: string;
}

export interface ITemplateInfo {
    [relativeHtmlPath: string]: ITemplateInfoEntry;
}

export interface ITemplateInfoEntry {
    memberAccess: IMemberAccessEntry[];
    formNames: string[];
}
