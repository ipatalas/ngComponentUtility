angular
  .module('app')
  .config(function ($stateProvider) {
    $stateProvider
      .state('example_route', {
		template: 'Route inline template',
      });
  });