/* tslint:disable */
export class TestController {
	private privateField: string;
	public publicField: string;
	implicitlyPublicField: string;
	customType: IReturnType;

	testMethod(p1: string): number {
		return 0;
	}

	arrowFunction = (p1: string, p2: number): number => {
		return 1;
	}
}

angular.module('app').controller('TestController', TestController);

interface IReturnType {
	field: string;
}