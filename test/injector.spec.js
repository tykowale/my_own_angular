'use strict';

var setupModuleLoader = require('../src/loader');
var createInjector = require('../src/injector');

fdescribe('injector', function() {
    var angular;

    beforeEach(function() {
        delete window.angular;
        setupModuleLoader(window);
        angular = window.angular;
    });

    it('can be created', function() {
        var injector = createInjector([]);
        expect(injector).toBeDefined();
    });

    it('has a constant that has been registered to a module', function() {
        var module = angular.module('myModule', []);
        module.constant('aConstant', 42);
        var injector = createInjector(['myModule']);
        expect(injector.has('aConstant')).toBe(true);
    });

    it('does not have a non-registered constant', function() {
        angular.module('myModule', []);
        var injector = createInjector(['myModule']);
        expect(injector.has('aConstant')).toBe(false);
    });

    it('does not allow a constant called hasOwnProperty', function() {
        var module = angular.module('myModule', []);
        module.constant('hasOwnProperty', false);
        expect(function() {
            createInjector(['myModule']);
        }).toThrow();
    });

    it('can return a registered constant', function() {
        var module = angular.module('myModule', []);
        module.constant('aConstant', 42);
        var injector = createInjector(['myModule']);
        expect(injector.get('aConstant')).toBe(42);
    });

    it('loads multiple modules', function() {
        var module1 = angular.module('myModule', []);
        var module2 = angular.module('myOtherModule', []);

        module1.constant('aConstant', 42);
        module2.constant('anotherConstant', 43);
        var injector = createInjector(['myModule', 'myOtherModule']);

        expect(injector.has('aConstant')).toBe(true);
        expect(injector.has('anotherConstant')).toBe(true);
    });

    it('loads the rquired modules of a module', function() {
        var module1 = angular.module('myModule', []);
        var module2 = angular.module('myOtherModule', ['myModule']);

        module1.constant('aConstant', 42);
        module2.constant('anotherConstant', 43);
        var injector = createInjector(['myOtherModule']);

        expect(injector.has('aConstant')).toBe(true);
        expect(injector.has('anotherConstant')).toBe(true);
    });

    it('loads the transitively required modules of a module', function() {
        var module1 = angular.module('myModule', []);
        var module2 = angular.module('myOtherModule', ['myModule']);
        var module3 = angular.module('myThirdModule', ['myOtherModule']);

        module1.constant('aConstant', 42);
        module2.constant('anotherConstant', 43);
        module3.constant('aThirdConstant', 44);
        var injector = createInjector(['myThirdModule']);

        expect(injector.has('aConstant')).toBe(true);
        expect(injector.has('anotherConstant')).toBe(true);
        expect(injector.has('aThirdConstant')).toBe(true);
    });

    it('loads each module only once', function() {
        angular.module('myModule', ['myOtherModule']);
        angular.module('myOtherModule', ['myModule']);

        createInjector(['myModule']);
    });

    it('invokes an annotated function with dependency injection', function() {
        var module = angular.module('myModule', []);
        module.constant('a', 1);
        module.constant('b', 2);
        var injector = createInjector(['myModule']);

        function fn(one, two) {
            return one + two;
        }

        fn.$inject = ['a', 'b'];
        expect(injector.invoke(fn)).toBe(3);
    });

    it('does not accept non-strings as injection tokens', function() {
        var module = angular.module('myModule', []);
        module.constant('a', 1);
        var injector = createInjector(['myModule']);

        function fn(one, two) {
            return one + two;
        }

        fn.$inject = ['a', 2];
        expect(function() {
            injector.invoke(fn);
        }).toThrow();

    });

    it('invokes a function with the given this context', function() {
        var module = angular.module('myModule', []);
        module.constant('a', 1);
        var injector = createInjector(['myModule']);

        var obj = {
            two: 2,
            fn: function(one) {
                return one + this.two;
            }
        };
        obj.fn.$inject = ['a'];

        expect(injector.invoke(obj.fn, obj)).toBe(3);
    });
});
