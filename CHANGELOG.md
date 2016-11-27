# Change Log

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