'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import * as componentTemplateService from './../services/componentTemplateService';

var validateComponentName = (componentName: string): string => {    
    if (! /^[a-z][a-zA-Z]+$/.test(componentName)) {
        return "Component name should contains only character a-z A-Z and start from lower char";
    }
    return null;
}

export function generateComponentTemplate(extensionRootPath: string, dirRootPath:string) {

    var inputOptions = <vscode.InputBoxOptions>{
        prompt: "Please enter compoment name.",
        validateInput: validateComponentName
    };

    vscode.window
        .showInputBox(inputOptions)
        .then((componentName:string) => {
            var templateName = "test";
            var templatesRootPath = path.join(extensionRootPath, "data", "templates", templateName)
            componentTemplateService.createComponentTemplates(templatesRootPath, dirRootPath, componentName);
        });
}
