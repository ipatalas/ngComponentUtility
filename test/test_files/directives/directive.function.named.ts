module Inside.A.Module {
	function functionDirective() {
		return {
			restrict: 'E'
		}
	}

	angular.module('app').directive('functionDirective', functionDirective);
}