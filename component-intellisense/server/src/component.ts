import * as fs from 'fs';
import * as decamelize from 'decamelize';

export interface IComponentBinding {
    name: string;
    htmlName: string;
    type: string;
}

export class Component {
    name: string;
    htmlName: string;
    controllerName: string;
    bindings: Map<string, IComponentBinding> = new Map<string, IComponentBinding>();

    public static parse(path: string): Promise<Component[]> {
        return new Promise<Component[]>((resolve, reject) => {
            fs.readFile(path, 'utf8', (err, contents) => {
                if (err) return reject(err);

                let regex = /component\(((?:.|\s)*?)\)/g;
                let match: RegExpExecArray;
                let results: Component[] = [];

                while (match = regex.exec(contents)) {
                    let componentJson = match[1].replace(/(\w+)\s*:/g, '"$1":') // surround keys with quotes
                                                .replace(/(:\s*)?'([^\']*)'/g, '$1"$2"'); // replace single quotes for values

                    let [name, config] = JSON.parse(`[${componentJson}]`);

                    let result = new Component();
                    result.name = name;
                    result.htmlName = decamelize(name, '-');
                    result.controllerName = config.controller;

                    Object.keys(config.bindings).forEach(key => {
                        result.bindings.set(key, this.createBinding(key, config.bindings[key]));
                    });

                    results.push(result);
                }

                resolve(results);
            });
        });
    }

    private static createBinding(key: string, type: string): IComponentBinding {
        let result = <IComponentBinding>{};
        result.name = key;
        result.type = type;
        result.htmlName = decamelize(key, '-');

        return result;
    }
}

// async function test() {
//     // Test code
//     let path = 'D:/Projects/KnightFrank.Antares/src/wwwroot/app/common/components/card/item/cardComponent.ts'
//     path = 'D:/Projects/KnightFrank.Antares/src/wwwroot/app/activity/edit/activityEditComponent.ts';
//     let component = await Component.parse(path);
//     console.dir(component);
// }

// test();