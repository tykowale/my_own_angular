'use strict';

var sinon = require('sinon');
var publishExternalAPI = require('../src/angular_public');
var createInjector = require('../src/injector');

fdescribe('$http', function() {
    var $http;
    var xhr;
    var requests;

    beforeEach(function() {
        publishExternalAPI();
        var injector = createInjector(['ng']);
        $http = injector.get('$http');
        xhr = sinon.useFakeXMLHttpRequest();
        requests = [];
        xhr.onCreate = function(req) {
            requests.push(req);
        };
    });

    afterEach(function() {
        xhr.restore();
    });

    it('is a function', function() {
        expect($http instanceof Function).toBe(true);
    });

    it('returns a Promise', function() {
        var result = $http({});

        expect(result).toBeDefined();
        expect(result.then).toBeDefined();
    });

    it('makes an XMLHttpRequest to given URL', function() {
        $http({
            method: 'POST',
            url: 'http://www.google.com',
            data: 'hello'
        });

        expect(requests.length).toBe(1);
        expect(requests[0].method).toBe('POST');
        expect(requests[0].url).toBe('http://www.google.com');
        expect(requests[0].async).toBe(true);
        expect(requests[0].requestBody).toBe('hello');
    });

    it('resolves proise when XHR result recieved', function(done) {
        var requestConfig = {
            method: 'GET',
            url: 'http://www.google.com'
        };

        $http(requestConfig).then(function(response) {
            expect(response.status).toBe(200);
            expect(response.statusText).toBe('OK');
            expect(response.data).toBe('Hello');
            expect(response.config.url).toBe('http://www.google.com');
            done();
        });

        requests[0].respond(200, {}, 'Hello');
    });

    it('rejects promise when XHR result recieved with error status', function(done) {
        var requestConfig = {
            method: 'GET',
            url: 'http://www.google.com'
        };

        $http(requestConfig).catch(function(response) {
            expect(response.status).toBe(401);
            expect(response.statusText).toBe('Unauthorized');
            expect(response.data).toBe('Fail');
            expect(response.config.url).toBe('http://www.google.com');
            done();
        });

        requests[0].respond(401, {}, 'Fail');
    });

    it('rejects promise when XHR result errors/aborts', function(done) {
        var requestConfig = {
            method: 'GET',
            url: 'http://www.google.com'
        };

        $http(requestConfig).catch(function(response) {
            expect(response.status).toBe(0);
            expect(response.data).toBe(null);
            expect(response.config.url).toBe('http://www.google.com');
            done();
        });

        requests[0].onerror();
    });
});
