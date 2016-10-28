'use strict';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

const REGEX: string = "template";

export function createDestinationFileName(templateFileName: string, componentName: string) {
    return templateFileName.replace(REGEX, componentName);
}

export function prepareContent(templateContent:string, componentName:string):string {
    return templateContent;
}