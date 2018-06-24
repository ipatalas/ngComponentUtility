// @ts-ignore
import ExampleController from './exported_controller';
import angular from 'angular';

const template = require('./example-template.html');

class ExampleComponent {
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
