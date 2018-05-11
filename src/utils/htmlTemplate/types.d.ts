import { IMemberAccessEntry } from './streams/memberAccessParser';

export interface IHtmlTemplateInfoResult {
    htmlReferences: IHtmlReferences;
    memberAccess: IMemberAccessResults;
    formNames: IFormNames;
}

export interface IHtmlReferences {
    [componentName: string]: IComponentReferences;
}

export interface IComponentReferences {
    [relativeHtmlPath: string]: IComponentReference[];
}

export interface IComponentReference {
    line: number;
    col: number;
}

export interface IMemberAccessResults {
    [relativeHtmlPath: string]: IMemberAccessEntry[];
}

export interface IFormNames {
    [relativeHtmlPath: string]: string[];
}