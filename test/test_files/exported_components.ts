// tslint:disable-next-line:variable-name
export let ExampleComponentLiteral: ng.IComponentOptions = {
	controller: 'ExampleCtrl',
	bindings: {
		exampleBinding: '<'
	}
};

export class ExampleComponentClass implements ng.IComponentOptions {
	public controller = 'ExampleCtrl';
	public bindings = {
		exampleBinding: "<"
	};
}
