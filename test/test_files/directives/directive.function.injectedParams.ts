module Inside.A.Module {
	angular.module('app').directive('functionDirective', ['$interval', 'dateFilter', function ($interval, dateFilter) {
		return {
			restrict: 'E'
		}
	}]);
}