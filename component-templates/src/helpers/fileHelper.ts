'use strict';

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export function findFiles(dirPath: string): string[] {
    var templateFiles = fs.readdirSync(dirPath).map(function (item) {
        return fs.statSync(path.join(dirPath, item)).isFile() ? item : null;
    }).filter(function (filename) {
        return filename !== null;
    });
    return templateFiles;
}

export function readFile(filePath: string):string {
    return fs.readFileSync(filePath,"UTF8");
}

export function createDirIfNotExist(dirPath: string) {
    if (fs.existsSync(dirPath)) {
        return;
    }
    fs.mkdirSync(dirPath, '0755');
}

export function createFile(filePath: string, fileContent) {
    fs.writeFile(filePath, fileContent);
}
