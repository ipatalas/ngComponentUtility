module Inside.A.Module {
	const functionDirective = () => {
		return {
			restrict: 'E'
		}
	}

	angular.module('app').directive('functionDirective', functionDirective);

}