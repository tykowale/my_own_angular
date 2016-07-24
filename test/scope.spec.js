'use strict';

var _ = require('lodash');
var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');

describe('Scope', function() {
    var scope;

    beforeEach(function() {
        publishExternalAPI();
        scope = createInjector(['ng']).get('$rootScope');
        scope.counter = 0;
    });

    function increaseCounter(newValue, oldValue, scope) {
        scope.counter++;
    }

    function returnValue(scope) {
        return scope.aValue;
    }

    function returnAnotherValue(scope) {
        return scope.anotherValue;
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

    describe('$watchGroup', function() {
        it('takes watches as an array and calls listener with arrays', function() {
            var gotNewValues, gotOldValues;

            scope.aValue = 1;
            scope.anotherValue = 2;

            scope.$watchGroup([returnValue, returnAnotherValue],
                function(newValues, oldValues) {
                    gotNewValues = newValues;
                    gotOldValues = oldValues;
                }
            );

            scope.$digest();
            expect(gotNewValues).toEqual([1, 2]);
            expect(gotOldValues).toEqual([1, 2]);
        });

        it('only calls listener once per digest', function() {
            scope.aValue = 1;
            scope.anotherValue = 2;

            scope.$watchGroup(
                [returnValue, returnAnotherValue],
                increaseCounter
            );
            scope.$digest();

            expect(scope.counter).toEqual(1);
        });

        it('uses the same array of old and new values on the first run', function() {
            var gotNewValues, gotOldValues;

            scope.aValue = 1;
            scope.anotherValue = 2;

            scope.$watchGroup(
                [returnValue, returnAnotherValue],
                function(newValues, oldValues) {
                    gotNewValues = newValues;
                    gotOldValues = oldValues;
                }
            );

            scope.$digest();
            expect(gotNewValues).toBe(gotOldValues);
        });

        it('uses different arrays for old and new values on subsequent runs', function() {
            var gotNewValues, gotOldValues;

            scope.aValue = 1;
            scope.anotherValue = 2;

            scope.$watchGroup(
                [returnValue, returnAnotherValue],
                function(newValues, oldValues) {
                    gotNewValues = newValues;
                    gotOldValues = oldValues;
                }
            );
            scope.$digest();

            scope.anotherValue = 3;
            scope.$digest();
            expect(gotNewValues).toEqual([1, 3]);
            expect(gotOldValues).toEqual([1, 2]);
        });

        it('calls the listener once when the watch array is empty', function() {
            var gotNewValues, gotOldValues;

            scope.$watchGroup(
                [],
                function(newValues, oldValues) {
                    gotNewValues = newValues;
                    gotOldValues = oldValues;
                }
            );

            scope.$digest();

            expect(gotNewValues).toEqual([]);
            expect(gotOldValues).toEqual([]);
        });

        it('can be deregistered', function() {
            scope.aValue = 1;
            scope.anotherValue = 2;

            var destroyGroup = scope.$watchGroup(
                [returnValue, returnAnotherValue],
                increaseCounter
            );

            scope.$digest();
            expect(scope.counter).toEqual(1);

            scope.anotherValue = 3;
            destroyGroup();
            scope.$digest();

            expect(scope.counter).toEqual(1);
        });

        it('does not call the zero-watch listener when deregistered first', function() {
            var destroyGroup = scope.$watchGroup(
                [],
                increaseCounter
            );

            destroyGroup();
            scope.$digest();

            expect(scope.counter).toEqual(0);
        });
    });

    describe('inheritance', function() {
        var parent;
        beforeEach(function() {
            publishExternalAPI();
            parent = createInjector(['ng']).get('$rootScope');
        });

        it('inherits the parents properties', function() {
            parent.aValue = [1, 2, 3];

            var child = parent.$new();

            expect(child.aValue).toEqual([1, 2, 3]);
        });

        it('does not cause a parent to inherit its properties', function() {
            var child = parent.$new();

            child.aValue = [1, 2, 3];

            expect(parent.aValue).toBeUndefined();
        });

        it('can watch a property in the parent', function() {
            var child = parent.$new();
            parent.aValue = [1, 2, 3];
            child.counter = 0;

            child.$watch(
                returnValue,
                increaseCounter,
                true
            );

            child.$digest();
            expect(child.counter).toBe(1);

            parent.aValue.push(4);
            child.$digest();

            expect(child.counter).toBe(2);
        });

        it('can be nested at any depth', function() {
            var a = parent;
            var aa = a.$new();
            var aaa = aa.$new();
            var aab = aa.$new();
            var ab = a.$new();
            var abb = ab.$new();

            a.value = 1;

            expect(aa.value).toBe(1);
            expect(aaa.value).toBe(1);
            expect(aab.value).toBe(1);
            expect(ab.value).toBe(1);
            expect(abb.value).toBe(1);

            ab.anotherValue = 2;

            expect(abb.anotherValue).toBe(2);
            expect(aa.anotherValue).toBeUndefined();
            expect(aaa.anotherValue).toBeUndefined();
        });

        it('shadows a parents property with the same name', function() {
            var child = parent.$new();

            parent.name = 'Joe';
            child.name = 'Jill';

            expect(child.name).toBe('Jill');
            expect(parent.name).toBe('Joe');

        });

        it('does not shadow members of parent scope attributes', function() {
            var child = parent.$new();

            parent.user = {
                name: 'Joe'
            };
            child.user.name = 'Jill';

            expect(child.user.name).toBe('Jill');
            expect(parent.user.name).toBe('Jill');
        });

        it('does not digest its parent(s)', function() {
            var child = parent.$new();

            parent.aValue = 'abc';
            parent.$watch(
                returnValue,
                function(newValue, oldValue, scope) {
                    scope.aValueWas = newValue;
                }
            );

            child.$digest();
            expect(child.aValueWas).toBeUndefined();
        });

        it('keeps a record of its children', function() {
            var child1 = parent.$new();
            console.error(child1);
            var child2 = parent.$new();
            console.error(child2);
            var child2_1 = child2.$new();

            expect(parent.$$children.length).toBe(2);
            expect(parent.$$children[0]).toBe(child1);
            expect(parent.$$children[1]).toBe(child2);

            expect(child1.$$children.length).toBe(0);

            expect(child2.$$children.length).toBe(1);
            expect(child2.$$children[0]).toBe(child2_1);
        });

        it('digests its children', function() {
            var child = parent.$new();

            parent.aValue = 'abc';
            child.$watch(
                returnValue,
                function(newValue, oldValue, scope) {
                    scope.aValueWas = newValue;
                }
            );

            parent.$digest();
            expect(child.aValueWas).toBe('abc');
        });

        it('digests from root on $apply', function() {
            var child = parent.$new();
            var child2 = child.$new();

            parent.aValue = 'abc';
            parent.counter = 0;
            parent.$watch(
                returnValue,
                increaseCounter
            );

            child2.$apply(_.noop);
            expect(parent.counter).toBe(1);
        });

        it('schedules a digest from root on $evalAsync', function(done) {
            var child = parent.$new();
            var child2 = child.$new();

            parent.aValue = 'abc';
            parent.counter = 0;

            parent.$watch(
                returnValue,
                increaseCounter
            );

            child2.$evalAsync(_.noop);

            setTimeout(function() {
                expect(parent.counter).toBe(1);
                done();
            }, 50);
        });

        it('does not have access to parent attributes when isolated', function() {
            var child = parent.$new(true);

            parent.aValue = 'abc';

            expect(child.aValue).toBeUndefined();
        });

        it('cannot watch parent attributes when isolated', function() {
            var child = parent.$new(true);

            parent.aValue = 'abc';
            child.$watch(
                returnValue,
                function(newValue, oldValue, scope) {
                    scope.aValueWas = newValue;
                }
            );

            child.$digest();
            expect(child.aValueWas).toBeUndefined();
        });

        it('digests its isolated children', function() {
            var child = parent.$new(true);

            child.aValue = 'abc';
            child.$watch(
                returnValue,
                function(newValue, oldValue, scope) {
                    scope.aValueWas = newValue;
                }
            );

            parent.$digest();
            expect(child.aValueWas).toBe('abc');
        });

        it('digests from root on $apply when isolated', function(done) {
            var child = parent.$new(true);
            var child2 = child.$new();

            parent.aValue = 'abc';
            parent.counter = 0;

            parent.$watch(
                returnValue,
                increaseCounter
            );

            child2.$evalAsync(_.noop);

            setTimeout(function() {
                expect(parent.counter).toBe(1);
                done();
            }, 50);
        });

        it('executes $evalAsync functions on isolated scopes', function(done) {
            var child = parent.$new(true);

            child.$evalAsync(function(scope) {
                scope.didEvalAsync = true;
            });

            setTimeout(function() {
                expect(child.didEvalAsync).toBe(true);
                done();
            }, 50);
        });

        it('executes $$postDigest functions on isolated scopes', function() {
            var child = parent.$new(true);

            child.$$postDigest(function() {
                child.didPostDigest = true;
            });

            parent.$digest();

            expect(child.didPostDigest).toBe(true);
        });

        it('executes $applyAsync functions on isolated scopes', function() {
            var child = parent.$new(true);
            var applied = false;

            parent.$applyAsync(function() {
                applied = true;
            });

            child.$digest();

            expect(applied).toBe(true);
        });

        it('can take some other scope as the parent', function() {
            var prototypeParent = parent.$new();
            var hierarchyParent = parent.$new();
            var child = prototypeParent.$new(false, hierarchyParent);

            prototypeParent.a = 42;
            expect(child.a).toBe(42);

            child.counter = 0;
            child.$watch(function(scope) {
                scope.counter++;
            });

            prototypeParent.$digest();
            expect(child.counter).toBe(0);

            hierarchyParent.$digest();
            expect(child.counter).toBe(2);
        });

        it('is no longer digested when $destroy has been called', function() {
            var child = parent.$new();

            child.aValue = [1, 2, 3];
            child.counter = 0;
            child.$watch(
                returnValue,
                increaseCounter,
                true
            );

            parent.$digest();
            expect(child.counter).toBe(1);

            child.aValue.push(4);
            parent.$digest();
            expect(child.counter).toBe(2);

            child.$destroy();
            child.aValue.push(5);
            parent.$digest();
            expect(child.counter).toBe(2);
        });
    });

    describe('$watchCollection', function() {
        var scope;

        beforeEach(function() {
            publishExternalAPI();
            scope = createInjector(['ng']).get('$rootScope');
            scope.counter = 0;
        });

        it('works like a normal watch for non-collections', function() {
            var valueProvided;

            scope.aValue = 42;

            scope.$watchCollection(
                returnValue,
                function(newValue, oldValue, scope) {
                    valueProvided = newValue;
                    scope.counter++;
                }
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
            expect(valueProvided).toBe(scope.aValue);

            scope.aValue = 43;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('works like a normal watch for NaNs', function() {
            scope.aValue = 0 / 0;

            scope.$watchCollection(
                returnValue,
                increaseCounter
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('notices when the value becomes an array', function() {
            scope.$watchCollection(
                function(scope) {
                    return scope.arr;
                },
                increaseCounter
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.arr = [1, 2, 3];
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices an item added to an array', function() {
            scope.aValue = [1, 2, 3];

            scope.$watchCollection(
                returnValue,
                increaseCounter
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.aValue.push(4);
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices an item removed from an array', function() {
            scope.aValue = [1, 2, 3];

            scope.$watchCollection(
                returnValue,
                increaseCounter
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.aValue.shift();
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices an item replaced in an array', function() {
            scope.aValue = [1, 2, 3];

            scope.$watchCollection(
                returnValue,
                increaseCounter
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.aValue[1] = 42;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices items reordered in an array', function() {
            scope.aValue = [2, 1, 3];

            scope.$watchCollection(
                returnValue,
                increaseCounter
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.aValue.sort();
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('does not fail on NaNs in arrays', function() {
            scope.aValue = [2, NaN, 3];

            scope.$watchCollection(
                returnValue,
                increaseCounter
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('notices an item replaced in an arguments object', function() {
            (function() {
                scope.aValue = arguments;
            })(1, 2, 3);

            scope.$watchCollection(
                returnValue,
                increaseCounter
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.aValue[1] = 42;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices an item replaced in a NodeList object', function() {
            document.documentElement.appendChild(document.createElement('div'));
            scope.aValue = document.getElementsByTagName('div');

            scope.$watchCollection(
                returnValue,
                increaseCounter
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            document.documentElement.appendChild(document.createElement('div'));
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices when the value becomes an object', function() {
            scope.$watchCollection(
                returnValue,
                increaseCounter
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.aValue = {
                a: 1
            };
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices when an attribute is added to an object', function() {
            scope.aValue = {
                a: 1
            };

            scope.$watchCollection(
                returnValue,
                increaseCounter
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.aValue.b = 2;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('notices when an attribute is changed in an object', function() {
            scope.aValue = {
                a: 1
            };

            scope.$watchCollection(
                returnValue,
                increaseCounter
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            scope.aValue.a = 2;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('does not fail on NaN attributes in object', function() {
            scope.aValue = {
                a: NaN
            };

            scope.$watchCollection(
                returnValue,
                increaseCounter
            );

            scope.$digest();
            expect(scope.counter).toBe(1);
        });

        it('notices when an attribute is removed from an object', function() {
            scope.aValue = {
                a: 1
            };

            scope.$watchCollection(
                returnValue,
                increaseCounter
            );

            scope.$digest();
            expect(scope.counter).toBe(1);

            delete scope.aValue.a;
            scope.$digest();
            expect(scope.counter).toBe(2);

            scope.$digest();
            expect(scope.counter).toBe(2);
        });

        it('does not consider any object with a length property an array', function() {
            scope.aValue = {
                length: 42,
                otherKey: 'abc'
            };

            scope.$watchCollection(
                returnValue,
                increaseCounter
            );

            scope.$digest();

            scope.aValue.key = 'def';
            scope.$digest();

            expect(scope.counter).toBe(2);
        });

        it('gives the old non-collection value to listeners', function() {
            scope.aValue = 42;
            var oldValueGiven;

            scope.$watchCollection(
                returnValue,
                function(newValue, oldValue) {
                    oldValueGiven = oldValue;
                }
            );

            scope.$digest();

            scope.aValue = 43;
            scope.$digest();

            expect(oldValueGiven).toBe(42);
        });

        it('gives the old array value to listeners', function() {
            scope.aValue = [1, 2, 3];
            var oldValueGiven;

            scope.$watchCollection(
                returnValue,
                function(newValue, oldValue) {
                    oldValueGiven = oldValue;
                }
            );

            scope.$digest();

            scope.aValue.push(4);
            scope.$digest();

            expect(oldValueGiven).toEqual([1, 2, 3]);
        });

        it('gives the old object value to listeners', function() {
            scope.aValue = {
                a: 1,
                b: 2
            };
            var oldValueGiven;

            scope.$watchCollection(
                returnValue,
                function(newValue, oldValue) {
                    oldValueGiven = oldValue;
                }
            );

            scope.$digest();

            scope.aValue.c = 3;
            scope.$digest();

            expect(oldValueGiven).toEqual({
                a: 1,
                b: 2
            });

            it('uses the new value as the old value on first digest', function() {
                scope.aValue = {
                    a: 1,
                    b: 2
                };
                var oldValueGiven;

                scope.$watchCollection(
                    returnValue,
                    function(newValue, oldValue) {
                        oldValueGiven = oldValue;
                    }
                );

                scope.$digest();

                expect(oldValueGiven).toEqual({
                    a: 1,
                    b: 2
                });
            });
        });
    });

    describe('Events', function() {
        var parent;
        var child;
        var isolatedChild;

        beforeEach(function() {
            publishExternalAPI();
            parent = createInjector(['ng']).get('$rootScope');
            scope = parent.$new();
            child = scope.$new();
            isolatedChild = scope.$new(true);
        });

        it('allows registering listeners', function() {
            var listener1 = _.noop;
            var listener2 = _.noop;
            var listener3 = _.noop;

            scope.$on('someEvent', listener1);
            scope.$on('someEvent', listener2);
            scope.$on('someOtherEvent', listener3);

            expect(scope.$$listeners).toEqual({
                someEvent: [listener1, listener2],
                someOtherEvent: [listener3]
            });
        });

        it('registers different listeners for every scope', function() {
            var listener1 = _.noop;
            var listener2 = _.noop;
            var listener3 = _.noop;

            scope.$on('someEvent', listener1);
            child.$on('someEvent', listener2);
            isolatedChild.$on('someEvent', listener3);

            expect(scope.$$listeners).toEqual({
                someEvent: [listener1]
            });
            expect(child.$$listeners).toEqual({
                someEvent: [listener2]
            });
            expect(isolatedChild.$$listeners).toEqual({
                someEvent: [listener3]
            });
        });

        _.forEach(['$emit', '$broadcast'], function(method) {
            it('calls the listeners of the matching event on ' + method, function() {
                var listener1 = jasmine.createSpy();
                var listener2 = jasmine.createSpy();

                scope.$on('someEvent', listener1);
                scope.$on('someOtherEvent', listener2);

                scope[method]('someEvent');

                expect(listener1).toHaveBeenCalled();
                expect(listener2).not.toHaveBeenCalled();
            });

            it('passes the same event object to each listener on ' + method, function() {
                var listener1 = jasmine.createSpy();
                var listener2 = jasmine.createSpy();

                scope.$on('someEvent', listener1);
                scope.$on('someEvent', listener2);

                scope[method]('someEvent');

                var event1 = listener1.calls.mostRecent().args[0];
                var event2 = listener2.calls.mostRecent().args[0];

                expect(event1).toBe(event2);
            });

            it('passes additional arguments to listeners on ' + method, function() {
                var listener = jasmine.createSpy();
                scope.$on('someEvent', listener);

                scope[method]('someEvent', 'and', ['additional', 'arguments'], '...');

                expect(listener.calls.mostRecent().args[1]).toEqual('and');
                expect(listener.calls.mostRecent().args[2]).toEqual(['additional', 'arguments']);
                expect(listener.calls.mostRecent().args[3]).toEqual('...');
            });

            it('returns the event object on ' + method, function() {
                var returnedEvent = scope[method]('someEvent');

                expect(returnedEvent).toBeDefined();
                expect(returnedEvent.name).toEqual('someEvent');
            });

            it('can be deregistered ' + method, function() {
                var listener = jasmine.createSpy();
                var deregister = scope.$on('someEvent', listener);

                deregister();
                scope[method]('someEvent');

                expect(listener).not.toHaveBeenCalled();
            });

            it('does not skip the next listener when removed on ' + method, function() {
                var deregister;
                var listener = function() {
                    deregister();
                };
                var nextListener = jasmine.createSpy();

                deregister = scope.$on('someEvent', listener);
                scope.$on('someEvent', nextListener);

                scope[method]('someEvent');
                expect(nextListener).toHaveBeenCalled();
            });

            it('sets defaultPrevented when preventDefault called on ' + method, function() {
                var listener = function(event) {
                    event.preventDefault();
                };

                scope.$on('someEvent', listener);

                var event = scope[method]('someEvent');

                expect(event.defaultPrevented).toBe(true);
            });

            it('does not stop on exceptions on ' + method, function() {
                var listener1 = function() {
                    throw 'listener1 thowing an exception';
                };

                var listener2 = jasmine.createSpy();
                scope.$on('someEvent', listener1);
                scope.$on('someEvent', listener2);

                scope[method]('someEvent');

                expect(listener2).toHaveBeenCalled();
            });
        });
        // end of combined emit and broadcast loop

        it('propagates up the scope hierarchy on $emit', function() {
            var parentListener = jasmine.createSpy();
            var scopeListener = jasmine.createSpy();

            parent.$on('someEvent', parentListener);
            scope.$on('someEvent', scopeListener);

            scope.$emit('someEvent');

            expect(scopeListener).toHaveBeenCalled();
            expect(parentListener).toHaveBeenCalled();
        });

        it('propagates up the same event on $emit', function() {
            var parentListener = jasmine.createSpy();
            var scopeListener = jasmine.createSpy();

            parent.$on('someEvent', parentListener);
            scope.$on('someEvent', scopeListener);

            scope.$emit('someEvent');

            var scopeEvent = scopeListener.calls.mostRecent().args[0];
            var parentEvent = parentListener.calls.mostRecent().args[0];

            expect(scopeEvent).toBe(parentEvent);
        });

        it('propagates down the scope hierarchy on $broadcast', function() {
            var scopeListener = jasmine.createSpy();
            var childListener = jasmine.createSpy();
            var isolatedChildListener = jasmine.createSpy();

            scope.$on('someEvent', scopeListener);
            child.$on('someEvent', childListener);
            isolatedChild.$on('someEvent', isolatedChildListener);

            scope.$broadcast('someEvent');

            expect(scopeListener).toHaveBeenCalled();
            expect(childListener).toHaveBeenCalled();
            expect(isolatedChildListener).toHaveBeenCalled();
        });

        it('propagates down the same event on $broadcast', function() {
            var scopeListener = jasmine.createSpy();
            var childListener = jasmine.createSpy();

            scope.$on('someEvent', scopeListener);
            child.$on('someEvent', childListener);

            scope.$broadcast('someEvent');

            var scopeEvent = scopeListener.calls.mostRecent().args[0];
            var childEvent = childListener.calls.mostRecent().args[0];

            expect(scopeEvent).toBe(childEvent);
        });

        it('attaches targetScope on $emit', function() {
            var scopeListener = jasmine.createSpy();
            var parentListener = jasmine.createSpy();

            scope.$on('someEvent', scopeListener);
            parent.$on('someEvent', parentListener);

            scope.$emit('someEvent');

            expect(scopeListener.calls.mostRecent().args[0].targetScope).toBe(scope);
            expect(parentListener.calls.mostRecent().args[0].targetScope).toBe(scope);
        });

        it('attaches targetScope on $broadcast', function() {
            var scopeListener = jasmine.createSpy();
            var childListener = jasmine.createSpy();

            scope.$on('someEvent', scopeListener);
            child.$on('someEvent', childListener);

            scope.$broadcast('someEvent');

            expect(scopeListener.calls.mostRecent().args[0].targetScope).toBe(scope);
            expect(childListener.calls.mostRecent().args[0].targetScope).toBe(scope);
        });

        it('attaches currentScope on $emit', function() {
            var currentScopeOnScope, currentScopeOnParent;
            var scopeListener = function(event) {
                currentScopeOnScope = event.currentScope;
            };

            var parentListener = function(event) {
                currentScopeOnParent = event.currentScope;
            };

            scope.$on('someEvent', scopeListener);
            parent.$on('someEvent', parentListener);

            scope.$emit('someEvent');

            expect(currentScopeOnScope).toBe(scope);
            expect(currentScopeOnParent).toBe(parent);
        });

        it('attaches currentScope on $broadcast', function() {
            var currentScopeOnScope, currentScopeOnChild;
            var scopeListener = function(event) {
                currentScopeOnScope = event.currentScope;
            };

            var childListener = function(event) {
                currentScopeOnChild = event.currentScope;
            };

            scope.$on('someEvent', scopeListener);
            child.$on('someEvent', childListener);

            scope.$broadcast('someEvent');

            expect(currentScopeOnScope).toBe(scope);
            expect(currentScopeOnChild).toBe(child);
        });

        it('sets currentScope to null after propagation on $emit', function() {
            var event;
            var scopeListener = function(evt) {
                event = evt;
            };
            scope.$on('someEvent', scopeListener);

            scope.$emit('someEvent');

            expect(event.currentScope).toBe(null);
        });

        it('sets currentScope to null after propagation on $broadcast', function() {
            var event;
            var scopeListener = function(evt) {
                event = evt;
            };
            scope.$on('someEvent', scopeListener);

            scope.$broadcast('someEvent');

            expect(event.currentScope).toBe(null);
        });

        it('does not propagate to parents when stopped', function() {
            var scopeListener = function(event) {
                event.stopPropagation();
            };
            var parentListener = jasmine.createSpy();

            scope.$on('someEvent', scopeListener);
            parent.$on('someEvent', parentListener);

            scope.$emit('someEvent');

            expect(parentListener).not.toHaveBeenCalled();
        });

        it('is received by listeners on current scope after being stopped', function() {
            var listener1 = function(event) {
                event.stopPropagation();
            };
            var listener2 = jasmine.createSpy();

            scope.$on('someEvent', listener1);
            scope.$on('someEvent', listener2);

            scope.$emit('someEvent');

            expect(listener2).toHaveBeenCalled();
        });

        it('fires $destroy when destroyed', function() {
            var listener = jasmine.createSpy();
            scope.$on('$destroy', listener);

            scope.$destroy();

            expect(listener).toHaveBeenCalled();
        });

        it('fires $destroy on children destroyed', function() {
            var listener = jasmine.createSpy();
            child.$on('$destroy', listener);

            scope.$destroy();

            expect(listener).toHaveBeenCalled();
        });

        it('no longer calls listeners after destroyed', function() {
            var listener = jasmine.createSpy();
            scope.$on('myEvent', listener);

            scope.$destroy();

            scope.$emit('myEvent');
            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('TTL configurability', function() {
        beforeEach(function() {
            publishExternalAPI();
        });

        it('allows configuring a shorter TTL', function() {
            var injector = createInjector(['ng',
                function($rootScopeProvider) {
                    $rootScopeProvider.digestTtl(5);
                }
            ]);
            var scope = injector.get('$rootScope');
            scope.counterA = 0;
            scope.counterB = 0;

            scope.$watch(
                function(scope) {
                    return scope.counterA;
                },
                function(newValue, oldValue, scope) {
                    if (scope.counterB < 5) {
                        scope.counterB++;
                    }
                });

            scope.$watch(
                function(scope) {
                    return scope.counterB;
                },
                function(newValue, oldValue, scope) {
                    scope.counterA++;
                });

            expect(function() {
                scope.$digest();
            }).toThrow();
        });
    });
});
