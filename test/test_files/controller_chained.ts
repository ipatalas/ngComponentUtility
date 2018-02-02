// tslint:disable:max-classes-per-file
// tslint:disable:indent

export class TestController1 {}
export class TestController2 {}
export class TestController3 {}

angular.module('app')
	   .controller('TestController1', TestController1)
	   .directive('directive', () => true);

angular.module('app')
	   .directive('directive', () => true)
	   .controller('TestController2', TestController2);

angular.module('app')
	   .directive('directive', () => true)
	   .controller('TestController3', TestController3)
	   .directive('directive', () => true);
