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
            'src/**/*.js': ['eslint', 'browserify']
        },
        autoWatch: true,
        reporters: ['spec'],
        browsers: ['PhantomJS'],
        browserify: {
            debug: true
        },
        specReporter: {
            suppressSkipped: true
        },
        eslint: {
            stopOnError: false,
            stopOnWarning: false,
            showWarnings: true
        }
    });
}
