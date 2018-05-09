angular
  .module('app')
  .config(function ($stateProvider) {
    $stateProvider
      .state('example_route', {
		template: require('./subdir/template.html'),
      });
  });