'use strict';

var setupModuleLoader = require('../src/loader');

describe('setupModuleLoader', function() {
    beforeEach(function() {
        delete window.angular;
    });

    it('exposes angular on the window', function() {
        setupModuleLoader(window);
        expect(window.angular).toBeDefined();
    });

    it('creates angular just once', function() {
        setupModuleLoader(window);
        var ng = window.angular;
        setupModuleLoader(window);
        expect(window.angular).toBe(ng);
    });

    it('exposesthe angular module function', function() {
        setupModuleLoader(window);
        expect(window.angular.module).toBeDefined();
    });

    it('exposes the angular module function just once', function() {
        setupModuleLoader(window);
        var module = window.angular.module;
        setupModuleLoader(window);
        expect(window.angular.module).toBe(module);
    });

    describe('modules', function() {
        var angular;

        beforeEach(function() {
            setupModuleLoader(window);
            angular = window.angular;
        });

        it('allows registering a module', function() {
            var myModule = angular.module('myModule', []);
            expect(myModule).toBeDefined();
            expect(myModule.name).toEqual('myModule');
        });

        it('replaces a module when registered with same name again', function() {
            var myModule = angular.module('myModule', []);
            var myNewModule = angular.module('myModule', []);
            expect(myNewModule).not.toBe(myModule);
        });

        it('attaches the requires array to the registered module', function() {
            var myModule = angular.module('myModule', ['myOtherModule']);
            expect(myModule.requires).toEqual(['myOtherModule']);
        });

        it('allows getting a module', function() {
            var myModule = angular.module('myModule', []);
            var gotModule = angular.module('myModule');

            expect(gotModule).toBeDefined();
            expect(gotModule).toBe(myModule);
        });

        it('throws when trying to get a nonexistent module', function() {
            expect(function() {
                angular.module('myModule');
            }).toThrow();
        });

        it('does not allow a module to be called hasOwnProperty', function() {
            expect(function() {
                angular.module('hasOwnProperty', []);
            }).toThrow();
        });
    });
});
