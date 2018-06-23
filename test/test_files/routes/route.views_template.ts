angular
  .module('app')
  .config(function ($stateProvider) {
    $stateProvider
      .state('example_route', {
		  views: {
			  'inline-component': 'InlineComponent',
			  'inline-template': {
				  template: 'inline-template'
			  },
			  'template-url': {
				  templateUrl: './subdir/template.html',
			  },
			  'template-component': {
				  component: 'TemplateComponent'
			  }
		  }
      });
  });