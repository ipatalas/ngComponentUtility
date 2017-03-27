const componentName = 'exampleComponent';
const componentConfiguration = {
	bindings: {
		config: '<',
		data: '<'
	}
};

angular.module('app').component(componentName, componentConfiguration);