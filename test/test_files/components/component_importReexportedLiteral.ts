import { ExampleComponentLiteral } from './reexported_components';
import angular from 'angular';

angular.module('app').component('exampleComponent', ExampleComponentLiteral);
