var _ = require('lodash');

(function() {
    'use strict';

    module.exports = function sayHello(to) {
        return _.template('Hello, <%= name %>!')({name: to});
    };
})();
