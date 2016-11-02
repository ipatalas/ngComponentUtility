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

                let regex = /component\(((?:.|\s)*?})\s*\)/g;
                let match: RegExpExecArray;
                let results: Component[] = [];

                while (match = regex.exec(contents)) {
                    let componentJson = match[1]
                        .replace(/(\w+)\s*:/g, '"$1":') // surround keys with quotes
                        .replace(/(:\s*)?'([^\']*)'/g, (m, p1, p2) => {
                            let prefix = p1 || '';
                            let quotes = '"' + p2.replace(/"/g, '\\"') + '"';
                            return prefix + quotes;
                        }) // replace single quotes for values
                        .replace(/,(\s*})/, "$1") // fix trailing commas
                        .replace(/\s*\/\/.*/g, ""); // remove line comments

                    let json = `[${componentJson}]`;
                    let [name, config] = JSON.parse(json);

                    let result = new Component();
                    result.name = name;
                    result.htmlName = decamelize(name, '-');
                    result.controllerName = config.controller;

                    if(!config.bindings) { continue;}

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
//     try {
//         // Test code
//         let path = 'D:/Projects/KnightFrank.Antares/src/wwwroot/app/common/components/card/item/cardComponent.ts'
//         path = 'D:/Projects/KnightFrank.Antares/src/wwwroot/app/common/components/attribute/range/rangeAttributeComponent.ts';
//         let component = await Component.parse(path);
//         console.dir(component, { depth: 5 });
//     } catch (ex) {
//         console.error(ex);
//     }
// }

// test();