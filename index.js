'use strict';

const Acorn = require('acorn');

const source = 'var x = 42; // Test'
let comments = [];
let ast = Acorn.parse(source, {
    onComment: comments
});
