angular
  .module('app')
  .config(function ($stateProvider) {
    $stateProvider
      .state('example_route', {
		templateUrl: './subdir/template.html',
      });
  });