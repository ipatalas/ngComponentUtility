import * as glob from 'glob';
import { Component } from './component'

export class SolutionScaner {

    private options: glob.IOptions = {};
    components: Component[] = [];

    findFiles = async () => {
        glob('**/*Component.ts', this.options, async (er, matches) => {
            for (var path of matches) {
                this.components.push.apply(this.components, await Component.parse(path));
            }
        });
    }

    init = (cwd: string) => {
        this.options.cwd = cwd;
    }
}
