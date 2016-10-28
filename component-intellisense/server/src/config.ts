export class Config implements FileSettings {
    ignore?: string[];
	componentGlob?: string;

    reload = (settings: Settings) =>{
        this.ignore = settings.ngIntelliSense.ignore;
        this.componentGlob = settings.ngIntelliSense.componentGlob;
    }
}

export interface Settings {
	ngIntelliSense: FileSettings;
}

export interface FileSettings {
	ignore?: string[];
	componentGlob?: string;
}

export var config = new Config();