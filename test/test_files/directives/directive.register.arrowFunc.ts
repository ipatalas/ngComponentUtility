module Inside.A.Module {
	// @ts-ignore
	export class ClassDirective implements ng.IDirective {}

	angular.module('app').directive('classDirective', () => new ClassDirective());
}