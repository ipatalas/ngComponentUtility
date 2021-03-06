# Change Log

## 1.0.0 (Jul 1, 2018)

* Merged [#30](https://github.com/ipatalas/ngComponentUtility/pull/30) - thanks to **[@avishnyak](https://github.com/avishnyak)**!
  * Addresses issue [#28](https://github.com/ipatalas/ngComponentUtility/issues/28) - adds support for ui-router views
  * Enhances handling of default exports
  * Added handling for all top-level ES module exports (there are others but they are less common for AngularJS)
  * Fixed a bug when parsing a component with bindings: true to isolate scope instead of actually providing a binding definition object
* `Find All References` enhancement:
  * It is now possible to use `Find All References` on any expression in the contoller, not only on controller's property declarations
  * Current state of the editor is taken into account instead of last saved one (it led to wrong results in many cases)
* Add support for Angular directives (class based so far, function based will follow)
  * `Go To Definition` and `Find All References` should work just fine
  * Introduced new command `Find unused Angular directives`
* Some minor bug fixes

## 0.9.1 (Jun 11, 2018)

* Fix for double 'Did you mean' suggestions when a suggestion is both a controller member and a binding
* Minor fixes for code actions matching and replacement
* Merged [#27](https://github.com/ipatalas/ngComponentUtility/pull/27) - thanks to **[@avishnyak](https://github.com/avishnyak)**!
  * Handle component definition on routes in ui-router

## 0.9.0 (Jun 03, 2018)

* Member diagnostics enhancements:
  * Code action with option to ignore specific member error
  * Code action with 'Did you mean' suggestions
  * Refresh diagnostics live when file is being edited
* Fixed [#26](https://github.com/ipatalas/ngComponentUtility/issues/26) - controller not found in ES6 import scenario
* Fixed [#25](https://github.com/ipatalas/ngComponentUtility/issues/25) - default ES6 exports are not picked up
* Other minor fixes

## 0.8.2 (May 21, 2018)

* Fix silent error after watch reload and improved logging there

## 0.8.1 (May 15, 2018)

* Member diagnostics enhancements:
  * It is now possible to decide which members are allowed in HTML templates (bindings, controller members or both)
* Added command to manually refresh member diagnostics in case watch reload still doesn't work

## 0.8.0 (May 13, 2018)

* Show diagnostics when invalid members are used in components' templates (check `README` for details)
* Controllers having base class(es) are now correctly parsed and all members from all base classes should be visible for all features!
* Improved Routes support:
  * Full template handling like for components (`was`: only inline templates)
  * Full controller handling like for components (`was`: no controller support at all)
  * `Go To Definition` works in Route templates
  * `Find All References` works in Route templates
  * Member auto-completion works in Route templates
* `Go To Definition` for scope-bound forms
* Constructor injected controller members are now visible for `Go To Definition`, `Find All References` and member auto-completion
* Include stack trace when logging errors
* TravisCI improvements
* Other minor fixes

## 0.7.4 (May 1, 2018)

* Fixed [#24](https://github.com/ipatalas/ngComponentUtility/issues/24) - watch reload not working correctly

## 0.7.3 (Feb 18, 2018)

* Fixed [#22](https://github.com/ipatalas/ngComponentUtility/issues/22) - custom Angular root folder
* Merged [#21](https://github.com/ipatalas/ngComponentUtility/pull/21) - thanks to **[@ekulabuhov](https://github.com/ekulabuhov)**!
  * Support for variable initialized template ([example](https://github.com/ipatalas/ngComponentUtility/blob/master/test/test_files/components/component_required_template.ts))
  * Support for constructor initialization for components ([example](https://github.com/ipatalas/ngComponentUtility/blob/master/test/test_files/components/component_constructor_init.ts))

## 0.7.2 (Feb 02, 2018)

* Fixed [#20](https://github.com/ipatalas/ngComponentUtility/issues/20) - Member completion doesn't work

## 0.7.1 (Oct 22, 2017)

* Performance improvements:
  * Removed glob dependency in favor of built-in VSCode mechanism - it's faster and finally allows relative patterns
  * Components analysis was broken by me while introducing some features recently - got it fixed again (went from ~3s down to 200-300ms in my reference project to analyze all components)
* Minor improvement when showing intellisense for model members - show bindings even if they are not specified in the controller
* Fixed console errors when component has no controller (my bad!)

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