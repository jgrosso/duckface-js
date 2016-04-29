'use strict';

const Acorn = require('acorn');

let unimplemented = () => {
    //throw new Error('TODO');
};

let assignments = {};

let properties = node => {
    switch (node.type) {
    case 'Identifier':
        return Object.create(assignments[node.name]);
    case 'Literal':
        return node.value;
    default:
        unimplemented();
    }
};

/*let isDefined = node => {
    let isUndefined = x => typeof x === 'undefined';

    switch (node.type) {
    case 'Identifier':
        return !isUndefined(assignments[node.name]);
    case 'Literal':
        break;
    case 'BinaryExpression':
        return isDefined(node.left) && isDefined(node.right);
    default:
        unimplemented();
    }
};*/

let handleVariableDeclaration = statement => {
    let handleIdentifier = declaration => {
        if (declaration.init) {
            assignments[declaration.id.name] = properties(declaration.init);
        }
    };
    
    let declarations = statement.declarations;
    for (let i = 0; i < declarations.length; ++i) {
        let declaration = declarations[i];
        
        switch (declaration.id.type) {
        case 'Identifier':
            handleIdentifier(declaration);
            break;
        default:
            unimplemented();
        }
    }
};

const source = 'var x = 4; var y = x * 2; // Test';
let comments = [];
let ast = Acorn.parse(source, {
    onComment: comments
}).body;

for (let i = 0; i < ast.length; ++i) {
    let statement = ast[i];
    
    switch (statement.type) {
    case 'VariableDeclaration':
        handleVariableDeclaration(statement);
        break;
    default:
        unimplemented();
    }
}

// EOF