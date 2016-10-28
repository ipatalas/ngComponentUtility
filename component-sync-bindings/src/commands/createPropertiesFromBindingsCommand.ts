'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';

export function run() {
    var controllerFilePath = getControllerFilePath();
    if (!fs.existsSync(controllerFilePath)) {
        vscode.window.showErrorMessage('Corresponding controller file not found: ' + controllerFilePath);
        return;
    }

    var componentContent = vscode.window.activeTextEditor.document.getText();
    var bindingsMatch = componentContent.match(/\sbindings\s*:\s*(\{(?:.|\s)*?\})/); // look for bindings
    if (bindingsMatch == null || bindingsMatch.length != 2) {
        vscode.window.showErrorMessage('Bindings not found in component file');
        return;
    }

    var bindings = getObjectFromDefinition(bindingsMatch[1]);

    var controllerContent = fs.readFileSync(controllerFilePath, 'utf8');
    var controllerMatch = controllerContent.match(/\{(?:.|\s)*?export\s+class\s\w+(?:.|\s)*?(\{(?:.|\s)*\})(?:.|\s)*?\}/);
    if (controllerMatch == null || controllerMatch.length != 2) {
        vscode.window.showErrorMessage('No controller body found in controller file.');
        return;
    }

    var controllerPropertiesMatch = controllerMatch[1].match(/\w+(?=\s*:(?:.|\s)*?;)/g);
    var bindingsToAdd: string[] = [];

    for (var key in bindings) {
        if (!bindings.hasOwnProperty(key)) continue;

        if (controllerPropertiesMatch.indexOf(key) == -1) {
            bindingsToAdd.push(key);
        }
    }

    if (bindingsToAdd.length > 0) {

        vscode.workspace
            .openTextDocument(controllerFilePath)
            .then(document => vscode.window.showTextDocument(document))
            .then(editor => {
                var indexOf = controllerContent.indexOf(controllerMatch[1]);
                var position = editor.document.positionAt(indexOf + 1);
                var contentToInsert = '\r\n' + bindingsToAdd.map(b => b + ':any;').join('\r\n');
                var endPosition = editor.document.positionAt(indexOf + contentToInsert.length + 1);
                return editor
                    .edit(editBuilder =>
                        editBuilder
                            .insert(
                            position, contentToInsert),
                    { undoStopBefore: true, undoStopAfter: true })
            });
    }
}

var getObjectFromDefinition = (inputDefinition: string): any => {
    var objectJson =
        inputDefinition
            .replace(/(\w+)\s*:/g, '"$1":')     // enclose object keys with parenthesis
            .replace(/:\s*'(.)*'/g, ':"$1"');   // make sure object values are enclosed with parenthesis

    return JSON.parse(objectJson);
}

var getControllerFilePath = () => {
    var currentFilePath = vscode.window.activeTextEditor.document.fileName;
    var currentDir = path.dirname(currentFilePath);
    var controllerFileName = path.basename(currentFilePath).replace('Component.ts', 'Controller.ts');
    var controllerFilePath = path.join(currentDir, controllerFileName);

    return controllerFilePath;
}

