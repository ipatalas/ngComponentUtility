
class Controller {
	public static componentName = 'exampleComponent';
	public static componentConfiguration = {
		bindings: {
			config: '<',
			data: '<'
		}
	};

}

angular.module('app').component(Controller.componentName, Controller.componentConfiguration);