(function() {
    'use strict';
    var _ = require('lodash');

    module.exports = Scope;

    function Scope() {
        this.$$watchers = [];
    }

    function initWatchVal() {}

    Scope.prototype.$watch = function(watchFn, listenerFn) {
        var watcher = {
            watchFn: watchFn,
            listenerFn: listenerFn || _.noop,
            last: initWatchVal
        };

        this.$$watchers.push(watcher);
    };

    Scope.prototype.$$digestOnce = function() {
        var self = this;
        var newValue;
        var oldValue;
        var dirty;

        _.forEach(this.$$watchers, function(watcher) {
            newValue = watcher.watchFn(self);
            oldValue = watcher.last;

            if (newValue !== oldValue) {
                watcher.last = newValue;
                watcher.listenerFn(newValue, (oldValue === initWatchVal ? newValue : oldValue),
                    self);
                dirty = true;
            }
        });

        return dirty;
    };

    Scope.prototype.$digest = function() {
        var dirty;
        do {
            dirty = this.$$digestOnce();
        } while (dirty);
    };
})();
