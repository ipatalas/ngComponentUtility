'use strict';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import * as fileHelper from './../helpers/fileHelper';
import * as componentTemplateHelper from './../helpers/componentTemplateHelper';
import * as workspaceSettingsService from './../services/workspaceSettingsService';

var createComponentDir = (dirRootPath: string, componentName: string): string => {
    var dirPath = path.join(dirRootPath, componentName);
    fileHelper.createDirIfNotExist(dirPath);
    return dirPath;
}

var createFileFromTemplate = (templateFilePath: string, destinationFilePath: string, tokens: componentTemplates.Tokens) => {
    var templateContent:string = fileHelper.readFile(templateFilePath);
    var destinationContent: string = componentTemplateHelper.prepareContent(templateContent, tokens);
    fileHelper.createFile(destinationFilePath, destinationContent);
}

export function createComponentTemplates(templatesRootPath: string, dirRootPath: string, componentName: string): void {
    var fileNames = fileHelper.findFiles(templatesRootPath);

    if (fileNames.length == 0) {
        vscode.window.showInformationMessage("Cannot find templates in " + templatesRootPath);
        return;
    }

    var componentDirPath:string = createComponentDir(dirRootPath, componentName);
    var settings:componentTemplates.Settings = workspaceSettingsService.getSettings();
    var tokens = componentTemplateHelper.createTokens(dirRootPath, componentDirPath, componentName, settings);

    fileNames.forEach((templateFileName) => {
        var templateFilePath = path.join(templatesRootPath, templateFileName);        
        var destinationFileName: string = componentTemplateHelper.createDestinationFileName(templateFileName, tokens);
        var destinationFilePath = path.join(componentDirPath, destinationFileName);

        createFileFromTemplate(templateFilePath, destinationFilePath, tokens);
    });
}