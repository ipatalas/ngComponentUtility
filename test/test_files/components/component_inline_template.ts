
function controller() {}

angular.module('moduleName').component('componentName', {
    template: '<b>inlineTemplateBody</b>',
    bindings: {
        data: '<'
    },
    controller: controller
});