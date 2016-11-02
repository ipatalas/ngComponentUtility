import * as glob from 'glob';
import { Component } from './component'

export class ComponentScanner {

    private options: IOptions = {};
    components: Component[] = [];

    findFiles = () => {		
        glob('**/*Component.ts', this.options, async (err, matches) => {			
            for (var path of matches) {				
                this.components.push.apply(this.components, await Component.parse(path));
            }
        });
    }

    init = (cwd: string) => {
        this.options.cwd = cwd;
		this.options.absolute = true;
    }
}

// @types/glob does not have 'absolute' field available yet
interface IOptions extends glob.IOptions {
	absolute?: boolean;
}
