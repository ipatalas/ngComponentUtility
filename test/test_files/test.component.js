(function () {
	'use strict';

	angular
		.module('app')
		.component('exampleComponent', {
			bindings: {
				config: '<',
				data: '<'
			}
		});
})();