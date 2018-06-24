import angular from 'angular';

export class ExampleComponentClass implements ng.IComponentOptions {
	public controller = 'ExampleCtrl';
	public bindings = {
		exampleBinding: '<'
	};
}

angular.module('app').component('exampleComponent', new ExampleComponentClass());
