module.exports = function(config) {
    config.set({
        basePath: '',
        colors: true,
        frameworks: ['browserify', 'jasmine'],
        files: [
            'src/**/*.js',
            'test/**/*.spec.js'
        ],
        preprocessors: {
            'test/**/*.js': ['eslint', 'browserify'],
            'src/**/*.js': ['eslint', 'browserify', 'coverage']
        },
        autoWatch: true,
        reporters: ['verbose', 'coverage'],
        browsers: ['PhantomJS'],
        browserify: {
            debug: true
        },
        coverageReporter: {
            type: 'text-summary'
        }
    });
}
