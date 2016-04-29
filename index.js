'use strict';

const Acorn = require('acorn');

let comments = [];
Acorn.parse('var x = 42; // Test', {
    onComment: comments
});
