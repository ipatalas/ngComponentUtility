import angular from 'angular';

// tslint:disable:max-classes-per-file
// tslint:disable:indent

export class TestController1 { }
export class TestController2 { }
export class TestController3 { }

const directive = () => ({restrict: 'E'});

angular.module('app')
	.controller('TestController1', TestController1)
	.directive('directive', directive);

angular.module('app')
	.directive('directive', directive)
	.controller('TestController2', TestController2);

angular.module('app')
	.directive('directive', directive)
	.controller('TestController3', TestController3)
	.directive('directive', directive);
