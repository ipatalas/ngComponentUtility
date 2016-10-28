declare namespace componentTemplates {    
    export interface Settings {
        applicationName:string;
        namespaceNamePrefix:string;
        sourceRelativePath:string;
        referenceAllRelativePath:string
    }

    export interface Tokens {
        fileName: string;
        referenceRelativePath: string;
        appName: string;
        namespaceName: string;
        controllerName: string;
        componentName: string;
        templateUrl: string;
    }
}