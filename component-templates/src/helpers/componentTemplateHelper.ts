'use strict';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

var firstLetterUppercase = (value: string): string => {
    if (!value) {
        return value;
    }
    if (value.length == 1) {
        return value.toLocaleUpperCase();
    }
    return value.charAt(0).toUpperCase() + value.substring(1);
}

export function createTokens(dirRootPath: string, componentDirPath:string, componentName: string, settings: componentTemplates.Settings): componentTemplates.Tokens {
    var sourcePath = path.join(vscode.workspace.rootPath, settings.sourceRelativePath);
    var referencePath = path.join(vscode.workspace.rootPath, settings.referenceAllRelativePath);
    var templateHtmlPath = path.join(componentDirPath, componentName + ".html");
    
    var componentNameUppercase = firstLetterUppercase(componentName);    
    return <componentTemplates.Tokens>{
        fileName: componentName,
        referenceRelativePath: path.relative(path.parse(templateHtmlPath).dir, referencePath),
        appName: settings.applicationName,
        namespaceName: settings.namespaceNamePrefix + "." + componentNameUppercase,
        controllerName: componentNameUppercase + "Controller",
        componentName: componentName,
        templateUrl: path.relative(path.parse(sourcePath).dir, templateHtmlPath)
    };
}

export function createDestinationFileName(templateFileName: string, tokens: componentTemplates.Tokens) {
    return templateFileName.replace("template", tokens.fileName);
}

export function prepareContent(templateContent: string, tokens: componentTemplates.Tokens): string {
    var content = templateContent.replace(/@referencePath@/g, tokens.referenceRelativePath);
    content = content.replace(/@appName@/g, tokens.appName);
    content = content.replace(/@namespaceName@/g, tokens.namespaceName);
    content = content.replace(/@controllerName@/g, tokens.controllerName);
    content = content.replace(/@componentName@/g, tokens.componentName);
    content = content.replace(/@templateUrl@/g, tokens.templateUrl);
    return content;
}