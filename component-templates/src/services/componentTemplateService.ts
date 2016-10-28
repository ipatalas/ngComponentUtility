'use strict';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import * as fileHelper from './../helpers/fileHelper';
import * as componentTemplateHelper from './../helpers/componentTemplateHelper';

var createComponentDir = (dirRootPath: string, componentName: string): string => {
    var dirPath = path.join(dirRootPath, componentName);
    fileHelper.createDirIfNotExist(dirPath);
    return dirPath;
}

var createFileFromTemplate = (templateFilePath: string, destinationFilePath: string, componentName: string) => {
    var templateContent:string = fileHelper.readFile(templateFilePath);
    var destinationContent: string = componentTemplateHelper.prepareContent(templateContent, componentName);
    fileHelper.createFile(destinationFilePath, destinationContent);
}

export function createComponentTemplates(templatesRootPath: string, dirRootPath: string, componentName: string): void {
    var fileNames = fileHelper.findFiles(templatesRootPath);

    if (fileNames.length == 0) {
        vscode.window.showInformationMessage("Cannot find templates in " + templatesRootPath);
        return;
    }

    var componentDir = createComponentDir(dirRootPath, componentName);
    fileNames.forEach((templateFileName) => {
        var templateFilePath = path.join(templatesRootPath, templateFileName);
        var destinationFileName: string = componentTemplateHelper.createDestinationFileName(templateFileName, componentName);
        var destinationFilePath = path.join(componentDir, destinationFileName);
        createFileFromTemplate(templateFilePath, destinationFilePath, componentName);
    });
}