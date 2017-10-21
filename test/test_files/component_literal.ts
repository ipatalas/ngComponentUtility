
let ExampleComponentLiteral: ng.IComponentOptions = {
	controller: 'ExampleCtrl',
	bindings: {
		exampleBinding: '<'
	}
};

angular.module('app').component('exampleComponent', ExampleComponentLiteral);
