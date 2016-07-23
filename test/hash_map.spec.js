var hashKey = require('../src/hash_map').hashKey;

describe('hash', function() {
    'use strict';

    describe('haskKey', function() {
        it('is undefined:undefined for undefined', function() {
            expect(hashKey(undefined)).toEqual('undefined:undefined');
        });

        it('is object:null for null', function() {
            expect(hashKey(null)).toEqual('object:null');
        });

        it('is boolean:true for true', function() {
            expect(hashKey(true)).toEqual('boolean:true');
        });

        it('is boolean:false for false', function() {
            expect(hashKey(false)).toEqual('boolean:false');
        });

        it('is number:1738 for 1738', function() {
            expect(hashKey(1738)).toEqual('number:1738');
        });

        it('is string:1738 for "1738"', function() {
            expect(hashKey('1738')).toEqual('string:1738');
        });
    });
});
