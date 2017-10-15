# Change Log

## 0.7.0 (Oct 16, 2017)

* Find All References now also finds controller members inside components html view
* Automatically refresh controller when file changes - field changes are reflected immediately in autocompletion
* Improved the way bindings are completed - cursor is now placed inside quotes instead of after them
* Fixed [#19](https://github.com/ipatalas/ngComponentUtility/issues/19) - fixed ES6 imports

## 0.6.8 (Jun 22, 2017)

* Implemented [#18](https://github.com/ipatalas/ngComponentUtility/issues/18) - auto-detect AngularJS projects

## 0.6.7 (Jun 15, 2017)

* Fixed [issue #16](https://github.com/ipatalas/ngComponentUtility/issues/16) - components without a template will no longer break the extension
* Improved logging when an extension breaking error occurs
* Minor improvement for component parsing

## 0.6.6 (Jun 13, 2017)

* Fixed [issue #14](https://github.com/ipatalas/ngComponentUtility/issues/14) - support for multi-level ES6 imports

## 0.6.5 (Jun 1, 2017)

* Fixed [issue #11](https://github.com/ipatalas/ngComponentUtility/issues/11) - incorrect component binding name suggested in HTML
* Fixed [issue #12](https://github.com/ipatalas/ngComponentUtility/issues/12) - better ES6 import handling
* Fixed [issue #13](https://github.com/ipatalas/ngComponentUtility/issues/13) - multiple chained component registrations

## 0.6.4 (May 26, 2017)

* Fixed [issue #8](https://github.com/ipatalas/ngComponentUtility/issues/8) - error analyzing controller members when parameters have no types
* Fixed [issue #9](https://github.com/ipatalas/ngComponentUtility/issues/9) - error analyzing route with typecast
* Logging improvement (stack trace)

## 0.6.3 (May 24, 2017)

* Minor improvement for error logging to allow better identification of issues (optional update for troubleshooting)

## 0.6.2 (May 21, 2017)

* Fixed [issue #2](https://github.com/ipatalas/ngComponentUtility/issues/2) - Components are not found when imported with `import` clause
* Fixed issue with file watcher - there have been some changes in VSCode API which must have broken it recently
* Minor improvement when showing intellisense for model members

## 0.6.1 (April 12, 2017)

* Fixed [issue #6](https://github.com/ipatalas/ngComponentUtility/issues/6) - high CPU usage when idle on some machines
## 0.6.0 (March 25, 2017)

* Added Go To Definition for view models (controller's members inside component's view) - only first level
* Fixed [issue #3](https://github.com/ipatalas/ngComponentUtility/issues/3) - vars/consts can be now used for component name or templateUrl
* Fixed [issue #4](https://github.com/ipatalas/ngComponentUtility/issues/4) - static class field can be now used for component name or templateUrl
* Fixed [issue #5](https://github.com/ipatalas/ngComponentUtility/issues/5) - static class field or var/const can be now used for component configuration
* Removed custom debug channel (not needed, Dev Tools are enough)
* Cosmetic changes to formatting of statistics in console (Dev Tools)

## 0.5.1 (March 22, 2017)

* Find All References and Find unused components feature now find usages in angular-ui-router files

## 0.5.0 (March 19, 2017)

* Added Find All References feature for components (works in html files, controller files and component files as well)
* Added new command to show unused components

## 0.4.0 (March 5, 2017)

* Added intellisense for view models (controller's members inside component's view)
* Updated Typescript to 2.2.1 to be able to parse files with all new features

## 0.3.2 (January 3, 2017)

* Fixed [issue #1](https://github.com/ipatalas/ngComponentUtility/issues/1) - component parsing didn't work with components inside anonymous closure
* Controller parsing improvements:
	* Added support for function controllers (pure JS projects)
	* Fixed #1 bug for controllers as well

## 0.3.1 (December 18, 2016)

* Components cache is now automatically rebuilt when files change
* Components are refreshed when glob in configuration changes

## 0.3.0 (November 27, 2016)

* Major improvements for Go To Definition feature:
	* Added option to go to component's template and/or controller (configurable)
	* It now works on closing tag as well
	* Positions are more accurate
* Added option to show debug console (can be used for troubleshooting)

## 0.2.1 (November 18, 2016)

* Added support for multiple globs
* Slight improvement for `Go To Definition` feature (cursor is now positioned exactly at the component)
* Component parsing rewritten to use TypeScript Compiler API (more reliable than regex parsing)
* Some improvements for error handling

## 0.2.0 (November 10, 2016)

* Fixed bug when parsing component with comments (thx @19majkel94 for reporting)
* Added new command to refresh components cache in a workspace along with status bar button
* Added basic support for Go To Definition for components

## 0.1.1 (November 6, 2016)

* Fixed Angular icon (non-transparent background - my bad!)
* Removed some dead configuration
* Added this change log file

## 0.1.0 (November 5, 2016)

* Initial Release