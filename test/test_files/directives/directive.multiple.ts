module Inside.A.Module {
	// @ts-ignore
	export class ClassDirective1 implements ng.IDirective {}
	export class ClassDirective2 implements ng.IDirective {}
	export class ClassDirective3 implements ng.IDirective {}

	angular.module('app').directive('classDirective1', () => new ClassDirective1());
	angular.module('app').directive('classDirective2', function() {
		return new ClassDirective2()
	});
	angular.module('app').directive('classDirective3', () => {
		return new ClassDirective3()
	});
}