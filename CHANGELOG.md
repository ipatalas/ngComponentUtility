# Change Log

## 0.5.0 (March 19, 2017)

* Added Find All References feature for components (works in html files, controller files and component files as well)
* Added new command to show unused components

## 0.4.0 (March 5, 2017)

* Added intellisense for view models (controller's members inside component's view)
* Updated Typescript to 2.2.1 to be able to parse files with all new features

## 0.3.2 (January 3, 2017)

* Fixed issue #1 - component parsing didn't work with components inside anonymous closure
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