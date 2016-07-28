'use strict';

var _ = require('lodash');

function $QProvider() {
    this.$get = ['$rootScope', function ($rootScope) {
        function Promise() {
            this.$$state = {};
        }

        Promise.prototype.then = function(onFulfilled, onRejected) {
            this.$$state.pending = this.$$state.pending || [];
            this.$$state.pending.push([null, onFulfilled, onRejected]);

            if(this.$$state.status > 0) {
                scheduleProcessQueue(this.$$state);
            }
        };

        function Deferred() {
            this.promise = new Promise();
        }

        Deferred.prototype.resolve = function(value) {
            if (this.promise.$$state.status) {
                return;
            }

            this.promise.$$state.value = value;
            this.promise.$$state.status = 1;
            scheduleProcessQueue(this.promise.$$state);
        };

        Deferred.prototype.reject = function(reason) {
            if (this.promise.$$state.status) {
                return;
            }

            this.promise.$$state.value = reason;
            this.promise.$$state.status = 2;
            scheduleProcessQueue(this.promise.$$state);
        };

        function defer() {
            return new Deferred();
        }

        function scheduleProcessQueue(state) {
            $rootScope.$evalAsync(function() {
                processQueue(state);
            });
        }

        function processQueue(state) {
            var pending = state.pending;
            state.pending = undefined;

            _.forEach(pending, function(handlers) {
                var fn = handlers[state.status];
                if (_.isFunction(fn)) {
                    fn(state.value);
                }
            });
        }

        return {
            defer: defer
        };
    }];
}

module.exports = $QProvider;
