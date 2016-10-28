'use strict';

import * as vscode from 'vscode';

export function getSettings(): componentTemplates.Settings {
    var config = vscode.workspace.getConfiguration();
    return <componentTemplates.Settings>{
        applicationName: config.get('objectivity.template.applicationName') || 'app',
        namespaceNamePrefix: config.get('objectivity.template.namespaceNamePrefix') || 'Objectivity',
        sourceRelativePath: config.get('objectivity.template.sourceRelativePath') || 'app',
        referenceAllRelativePath: config.get('objectivity.template.referenceAllRelativePath') || 'typings/_all.d.ts'
    }
}