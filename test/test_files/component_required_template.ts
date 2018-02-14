let template = require('./template.html');

function controller() {}

angular.module('moduleName').component('componentName', {
    template: template,
    bindings: {
        data: '<'
    },
    controller: controller
});