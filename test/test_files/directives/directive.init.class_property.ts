module Inside.A.Module {
	// @ts-ignore
	export class ClassDirective implements ng.IDirective {
		restrict = 'E';

		link(scope: ng.IScope, element: ng.IAugmentedJQuery, attrs: ng.IAttributes) {
			// directive logic
		};

		static factory() {
			var directive = () => {
				return new ClassDirective();
			};

			directive['$inject'] = [];
			return directive;
		}
	}

	angular.module('app').directive('classDirective', ClassDirective.factory());
}