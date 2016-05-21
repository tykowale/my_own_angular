'use strict';

var _ = require('lodash');
var Scope = require('../src/scope');

describe('Scope', function() {
    var scope;

    beforeEach(function() {
        scope = new Scope();
        scope.counter = 0;
    });

    function increaseCounter(newValue, oldValue, scope) {
        scope.counter++;
    }

    function returnValue(scope) {
        return scope.aValue;
    }

    describe('$digest', function() {
        function watcher(scope) {
            return scope.someValue;
        }

        function listener(newValue, oldValue, scope) {
            scope.counter++;
        }


        it('calls the listener function of a watch on the first $digest', function() {
            var watchFn = function() {
                return 'wat';
            };
            var listenerFn = jasmine.createSpy();
            scope.$watch(watchFn, listenerFn);

            scope.$digest();

            expect(listenerFn).toHaveBeenCalled();
        });

        it('calls the watch function with the scoep as an argument', function() {
            var watchFn = jasmine.createSpy();
            var listenerFn = _.noop;

            scope.$watch(watchFn, listenerFn);

            scope.$digest();

            expect(watchFn).toHaveBeenCalledWith(scope);
        });

        it('calls the listener function when the watched value changes', function() {
            scope.someValue = 'a';

            scope.$watch(watcher, listener);

            expect(scope.counter).toBe(0);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.someValue = 'b';
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });
        it('calls listener when watch value is first undefined', function() {

            scope.$watch(watcher, listener);

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('calls listener with new value as old value the first time', function() {
            scope.someValue = 123;
            var oldValueGiven;

            function setOldValue(newValue, oldValue) {
                oldValueGiven = oldValue;
            }

            scope.$watch(watcher, setOldValue);

            scope.$digest();
            expect(oldValueGiven).toBe(123);
        });

        it('may have watchers that omit the listener function', function() {
            var watchFn = jasmine.createSpy();
            scope.$watch(watchFn);

            scope.$digest();

            expect(watchFn).toHaveBeenCalled();
        });

        it('triggers chained watchers in the same digest', function() {
            scope.name = 'Ty';

            scope.$watch(
                function(scope) {
                    return scope.nameUpper;
                },
                function(newValue, oldValue, scope) {
                    if (newValue) {
                        scope.initial = newValue.substring(0, 1) + '.';
                    }
                }
            );

            scope.$watch(
                function(scope) {
                    return scope.name;
                },
                function(newValue, oldValue, scope) {
                    if (newValue) {
                        scope.nameUpper = newValue.toUpperCase();
                    }
                }
            );

            scope.$digest();
            expect(scope.initial).toBe('T.');

            scope.name = 'Bob';
            scope.$digest();
            expect(scope.initial).toBe('B.');
        });

        it('gives up on the watches after 10 iterations', function() {
            scope.counterA = 0;
            scope.counterB = 0;

            scope.$watch(
                function(scope) {
                    return scope.counterA;
                },
                function(newValue, oldValue, scope) {
                    scope.counterB++;
                }
            );
            scope.$watch(
                function(scope) {
                    return scope.counterB;
                },
                function(newValue, oldValue, scope) {
                    scope.counterA++;
                }
            );

            expect((function() {
                scope.$digest();
            })).toThrow();
        });

        it('ends the digest when the last watch is clean', function() {
            var watchExecutions = 0;
            scope.array = _.range(100);

            _.times(100, function(i) {
                scope.$watch(
                    function(scope) {
                        watchExecutions++;
                        return scope.array[i];
                    },
                    _.noop
                );
            });

            scope.$digest();
            expect(watchExecutions).toBe(200);

            scope.array[0] = 420;
            scope.$digest();
            expect(watchExecutions).toBe(301);
        });

        it('does not end digest so that new watches are not run', function() {
            scope.aValue = 'abc';

            scope.$watch(
                function(scope) {
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) {
                    scope.$watch(
                        function(scope) {
                            return scope.aValue;
                        },
                        listener
                    );
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('compares based on value if enabled', function() {
            scope.someValue = [1, 2, 3];

            scope.$watch(watcher, listener, true);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.someValue.push(4);
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('correctly handles NaNs', function() {
            scope.number = 0 / 0;

            scope.$watch(
                function(scope) {
                    return scope.number;
                },
                listener
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('catches exceptions in watch functions and continues', function() {
            scope.someValue = 'abc';

            scope.$watch(function() {
                throw 'Error';
            }, _.noop);
            scope.$watch(watcher, listener);

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('catches exceptions in listener functions and continues', function() {
            scope.someValue = 'a';

            scope.$watch(watcher, function() {
                throw 'Error';
            });
            scope.$watch(watcher, listener);

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('allows destroying a $watch with a removal function', function() {
            scope.someValue = 'abc';

            var destroyWatch = scope.$watch(watcher, listener);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.someValue = 'def';
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.someValue = 'ghi';
            destroyWatch();
            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('allows destroying a $watch during digest', function() {
            scope.someValue = 'abc';

            var watchCalls = [];

            scope.$watch(function(scope) {
                watchCalls.push('first');
                return scope.someValue;
            });

            var destroyWatch = scope.$watch(
                function() {
                    watchCalls.push('second');
                    destroyWatch();
                }
            );

            scope.$watch(function(scope) {
                watchCalls.push('third');
                return scope.someValue;
            });

            scope.$digest();
            expect(watchCalls).toEqual(['first', 'second', 'third', 'first', 'third']);
        });

        it('allows a $watch to destroy another during digest', function() {
            scope.someValue = 'abc';

            scope.$watch(watcher, function() {
                destroyWatch();
            });

            var destroyWatch = scope.$watch(_.noop, _.noop);

            scope.$watch(watcher, listener);

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('allows destroying several $watches during digest', function() {
            scope.someValue = 'abc';

            var destroyWatch1 = scope.$watch(function() {
                destroyWatch1();
                destroyWatch2();
            });

            var destroyWatch2 = scope.$watch(watcher, listener);

            scope.$digest();
            expect(scope.counter).toBe(0);
        });
    });

    describe('$eval', function() {
        it('executes $evaled function and returns result', function() {
            scope.aValue = 42;

            var result = scope.$eval(returnValue);

            expect(result).toBe(42);
        });

        it('passes the second $eval arg straight through', function() {
            scope.aValue = 44;

            var result = scope.$eval(returnValue, 2);

            expect(result).toBe(44);
        });
    });

    describe('$apply', function() {
        function returnValue(scope) {
            return scope.aValue;
        }

        it('executes the given function and starts the digest', function() {
            scope.aValue = 'someValue';

            scope.$watch(returnValue, increaseCounter);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$apply(function(scope) {
                scope.aValue = 'someOtherValue';
            });

            expect(scope.counter).toBe(2);
        });
    });

    describe('$evalAsync', function() {
        beforeEach(function() {
            scope.aValue = [1, 2, 3];
            scope.asyncEvaluated = false;
        });

        it('executes given function later in the same cycle', function() {
            scope.asyncEvaluatedImmediately = false;

            scope.$watch(
                function(scope) {
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) {
                    scope.$evalAsync(function(scope) {
                        scope.asyncEvaluated = true;
                    });
                    scope.asyncEvaluatedImmediately = scope.asyncEvaluated;
                });

            scope.$digest();
            expect(scope.asyncEvaluated).toBe(true);
            expect(scope.asyncEvaluatedImmediately).toBe(false);
        });

        it('executes $evalAsynced functions added by watch functions', function() {
            scope.$watch(
                function(scope) {
                    if (!scope.asyncEvaluated) {
                        scope.$evalAsync(function(scope) {
                            scope.asyncEvaluated = true;
                        });
                    }
                    return scope.aValue;
                }, _.noop);

            scope.$digest();
            expect(scope.asyncEvaluated).toBe(true);
        });

        it('executes $evalAsynced functions even when not dirty', function() {
            scope.asyncEvaluatedTimes = 0;

            scope.$watch(
                function(scope) {
                    if (scope.asyncEvaluatedTimes < 2) {
                        scope.$evalAsync(function(scope) {
                            scope.asyncEvaluatedTimes++;
                        });
                    }
                    return scope.aValue;
                });

            scope.$digest();

            expect(scope.asyncEvaluatedTimes).toBe(2);
        });

        it('eventually halts $evalAsyncs added by watches', function() {
            scope.$watch(function(scope) {
                scope.$evalAsync(_.noop);
                return scope.aValue;
            }, _.noop);

            expect(function() {
                scope.$digest();
            }).toThrow();
        });

        it('has a $$phase field whose value is the current digest phase', function() {
            scope.phaseInWatchFunction = undefined;
            scope.phaseInListenerFunction = undefined;
            scope.phaseInApplyFunction = undefined;

            scope.$watch(
                function(scope) {
                    scope.phaseInWatchFunction = scope.$$phase;
                    return scope.aValue;
                },
                function(newValue, oldValue, scope) {
                    scope.phaseInListenerFunction = scope.$$phase;
                }
            );

            scope.$apply(function(scope) {
                scope.phaseInApplyFunction = scope.$$phase;
            });

            expect(scope.phaseInWatchFunction).toBe('$digest');
            expect(scope.phaseInListenerFunction).toBe('$digest');
            expect(scope.phaseInApplyFunction).toBe('$apply');
        });

        it('schedules a digest in $evalAsync', function(done) {
            scope.$watch(returnValue, increaseCounter);

            scope.$evalAsync(_.noop);

            expect(scope.counter).toBe(0);
            setTimeout(function() {
                expect(scope.counter).toBe(1);
                done();
            });
        });

        it('catches exceptions', function(done) {
            scope.$watch(returnValue, increaseCounter);

            scope.$evalAsync(function() {
                throw 'Error';
            });

            setTimeout(function() {
                expect(scope.counter).toBe(1);
                done();
            }, 50);
        });
    });

    describe('$applyAsync', function() {
        it('allows async $apply with $applyAsync', function(done) {
            scope.$watch(returnValue, increaseCounter);

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$applyAsync(function(scope) {
                scope.aValue = 'abc';
            });
            expect(scope.counter).toBe(1);

            setTimeout(function() {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        it('never executes $applyAsynced function in the same cycle', function(done) {
            scope.aValue = [1, 2, 3];
            scope.asyncApplied = false;

            scope.$watch(returnValue,
                function(newValue, oldValue, scope) {
                    scope.$applyAsync(function(scope) {
                        scope.asyncApplied = true;
                    });
                });

            scope.$digest();
            expect(scope.asyncApplied).toBe(false);
            setTimeout(function() {
                expect(scope.asyncApplied).toBe(true);
                done();
            }, 50);
        });

        it('coalesces many calls to $applyAsync', function(done) {
            scope.$watch(
                function(scope) {
                    scope.counter++;
                    return scope.aValue;
                }, _.noop);

            scope.$applyAsync(function(scope) {
                scope.aValue = 'abc';
            });

            scope.$applyAsync(function(scope) {
                scope.aValue = 'def';
            });

            setTimeout(function() {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        it('cancels and flushes $applyAsync if digested first', function(done) {
            scope.$watch(
                function(scope) {
                    scope.counter++;
                    return scope.aValue;
                }, _.noop);

            scope.$applyAsync(function(scope) {
                scope.aValue = 'abc';
            });

            scope.$applyAsync(function(scope) {
                scope.aValue = 'def';
            });

            scope.$digest();
            expect(scope.counter).toBe(2);
            expect(scope.aValue).toBe('def');

            setTimeout(function() {
                expect(scope.counter).toBe(2);
                done();
            }, 50);
        });

        it('catches exceptions', function(done) {
            scope.$applyAsync(function() {
                throw 'Error';
            });

            scope.$applyAsync(function() {
                throw 'Error';
            });

            scope.$applyAsync(function(scope) {
                scope.applied = true;
            });

            setTimeout(function() {
                expect(scope.applied).toBe(true);
                done();
            }, 50);
        });
    });

    describe('$$postDigest', function() {
        it('runs after each digest', function() {
            scope.$$postDigest(
                function() {
                    scope.counter++;
                });

            expect(scope.counter).toBe(0);
            scope.$digest();

            expect(scope.counter).toBe(1);
            scope.$digest();

            expect(scope.counter).toBe(1);
        });

        it('does not include $$postDigest in the digest', function() {
            scope.aValue = 'original value';

            scope.$$postDigest(function() {
                scope.aValue = 'changed value';
            });

            scope.$watch(returnValue,
                function(newValue, oldValue, scope) {
                    scope.watchedValue = newValue;
                });

            scope.$digest();
            expect(scope.watchedValue).toBe('original value');

            scope.$digest();
            expect(scope.watchedValue).toBe('changed value');
        });

        it('catches exceptions', function() {
            var didRun = false;
            scope.$$postDigest(function() {
                throw 'Error';
            });

            scope.$$postDigest(function() {
                didRun = true;
            });

            scope.$digest();
            expect(didRun).toBe(true);
        });
    });
});
