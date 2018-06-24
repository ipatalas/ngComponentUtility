import { ExampleComponentClass } from './exported_components';
import angular from 'angular';

angular.module('app').component('exampleComponent', new ExampleComponentClass());
