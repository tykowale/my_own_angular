'use strict';

function hashKey(value) {
    var type = typeof value;
    return type + ':' + value;
}

module.exports = {hashKey: hashKey};
