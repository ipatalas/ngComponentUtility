# Angular components intellisense

This extension is a result of hackathon event done in the company we work for. We had an option to invest 2 days into anything we could possibly want.
We choose to develop an extension for VS Code which would make our daily work easier. Our current project is an Angular 1.5 based web application. As an Angular developers we wanted to have auto-completion for all custom components that are available in our application.
This is still a preview version. It's our first attempt to VS Code extension, so not everything may be perfect. Do not hesitate to report any issues you may find.

## Features

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

![Auto-completion popup](images/popup.png)

As a result component's html code along with all bindings is added:

![Auto-completion popup](images/result.png)

It can also help with bindings (will only suggest missing ones):

![Auto-completion popup](images/bindings.png)

## Configuration

This plugin contributes the following [settings](https://code.visualstudio.com/docs/customization/userandworkspace):

- `ngIntelliSense.componentGlob`: glob string used to search for components. Default value is  **\*\*/\*Component.ts**
- `ngIntelliSense.ignore`: ignored files *[not implemented yet]*

## Roadmap

The following features are planned:
- ability to specify multiple globs in configuration
- TBD
