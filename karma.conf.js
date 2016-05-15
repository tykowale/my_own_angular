module.exports = function(config) {
    config.set({
        frameworks: ['jasmine'],
        files: [
            'src/**/*.js',
            'test/**/*.spec.js'
        ],
        preprocessors: {
            'test/**/*.js': ['eslint'],
            'src/**/*.js': ['eslint']
        },
        browsers: ['PhantomJS']
    });
}
