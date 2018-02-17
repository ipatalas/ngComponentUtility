import ExampleController from './exported_controller';

const template = require('./example-template.html');

export class ExampleComponent {
    public controller: any;
    public bindings: any;
    public template: string;

    constructor() {
        this.controller = ExampleController;
        this.template = template;
        this.bindings = {
            data: '<'
        };
    }
}

angular
    .module('app', [])
    .component('exampleComponent', new ExampleComponent())

