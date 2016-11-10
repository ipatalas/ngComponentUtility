# Angular components intellisense

This extension is a result of hackathon event done in the company we work for. We had an option to invest 2 days into anything we could possibly want.
We chose to develop an extension for VS Code which would make our daily work easier. Our current project is an Angular 1.5 based web application. As an Angular developers we wanted to have auto-completion for all custom components that are available in our application.
This is still a preview version. It's our first attempt to VS Code extension, so not everything may be perfect.
Do not hesitate to [report](https://github.com/KamoHaladus/VSC-Hakaton/issues) any issues you may find.

## Features

### 1. Intellisense

Given the following components in a project:
```TypeScript
angular.module('app').component('exampleComponent', {
	/* other settings */
	bindings: {
		config: '<',
		data: '<'
	}
});

angular.module('app').component('otherComponent', {
	/* other settings */
	bindings: {
		config: '<',
		data: '<'
	}
});
```

One should be able to use auto-completion like that:

![Auto-completion popup](https://kf-ireneuszpatalas.github.io/popup.png)

As a result component's html code along with all bindings is added:

![Auto-completion popup](https://kf-ireneuszpatalas.github.io/result.png)

It can also help with bindings (will only suggest missing ones):

![Auto-completion popup](https://kf-ireneuszpatalas.github.io/bindings.png)

There is now a command to refresh components cache which might be useful if you're developing components constantly and don't want to restart vscode.
You can trigger the command from command panel, it's called `Refresh components cache`
Alternatively you can just click the button on the status bar:

![Status bar button](https://kf-ireneuszpatalas.github.io/statusbar.png)

### 2. Go To definition

You can go from html directly to the component being used. Just use F12 (default) or Go To Definition command (either from context menu or commands panel) when cursor is focused on a component.
It will go straight to the component definition.

## Configuration

This plugin contributes the following [settings](https://code.visualstudio.com/docs/customization/userandworkspace):

- `ngIntelliSense.componentGlob`: glob string used to search for components. Default value is  **\*\*/\*Component.ts**

## Roadmap

The following features are planned:
- ability to specify multiple globs in configuration
- **Find all references** for components in html view
- **Go to definition** for components in html view
	- ability to pick which file to open if possible (view, component or controller)
	- should work for both the component and it's attributes/bindings
- auto refresh components when they change (reload only the one that has changed)
- refresh all when configuration changes (glob for example)
- feature flags to disable specific functions
- rename component feature - update all usages
- rethink the way components are parsed (component config is not a JSON, might contain incompatible stuff)
	- `controller` field does not necessarily is a string, may be a class name directly
	- `template` field may `require` a file instead of hardcoding it in the component
	- make sure both TypeScript and bare JS are supported
