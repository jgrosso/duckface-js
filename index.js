'use strict';

const Acorn = require('acorn');
const _ = require('lodash');

const unimplemented = () => {
    throw new Error('TODO');
};

const parseTopLevelStatement = node => {
    let result = [];
    switch (node.type) {
        case 'FunctionDeclaration':
            return findCallExpressions(node.body);
        case 'FunctionExpression':
            return findCallExpressions(node.body);
        case 'VariableDeclaration':
            node.declarations.forEach(declaration => {
                result = result.concat(parseTopLevelStatement(declaration.init));
            });
            return result;
        default:
            debugger;
            unimplemented();
    }
};

const findCallExpressions = node => {
    var result = [];

    switch (node.type) {
        case 'BlockStatement':
            node.body.forEach(statement => {
                result = result.concat(findCallExpressions(statement));
            });
            return result;
        case 'ReturnStatement':
            return findCallExpressions(node.argument);
        case 'CallExpression':
            return [node];
        default:
            debugger;
            unimplemented();
    }

    return result;
};

let usedScopeNames = [];

const createScopeName = () => {
    let randomScopeName;
    do {
        randomScopeName = Math.floor(Math.random() * 1000000);
    } while (_.includes(usedScopeNames, randomScopeName));
    return randomScopeName;
};

let usedInterfaceSuffixes = [];

const convertPropertiesToInterface = properties => {
    let randomSuffix;
    do {
        randomSuffix = Math.floor(Math.random() * 1000000) + 1000;
    } while (_.includes(usedInterfaceSuffixes, randomSuffix));
    let randomInterfaceName = `Interface${randomSuffix}`;

    let interfaceProperties = [];
    properties.forEach(property => {
        interfaceProperties.push(`${property}: any`);
    });
    let interfaceBody = _.join(interfaceProperties, ',\n');

    return `
    interface ${randomInterfaceName} {
        ${interfaceBody}
    }
    `;
};

let properties = [];

const addProperty = (scope, objectName, property) => {
    if (!_.includes(properties, scope)) {
        properties.push({
            name: createScopeName(),
            node: scope,
            objects: []
        });
    }

    let objects = _.find(properties, x => x.node == scope).objects;
    if (!_.includes(objects, objectName)) {
        objects.push({
            name: objectName,
            properties: []
        });
    }

    let objectProperties = _.find(objects, x => x.name == objectName).properties;
    if (!_.includes(objectProperties, property.name)) {
        objectProperties.push(property.name);
    }
};

const source = `
function x(test) {
    return test.toString();
}
var x = function(test) {
    return test.toString2();
}
`;
let comments = [];
let ast = Acorn.parse(source, {
    onComment: comments
}).body;

let callExpressions = [];
ast.forEach(node => {
    callExpressions.push({
        node,
        callExpressions: parseTopLevelStatement(node)
    });
});

callExpressions.forEach(node => {
    node.callExpressions.forEach(callExpression => {
        switch (callExpression.callee.type) {
            case 'MemberExpression':
                switch (callExpression.callee.object.type) {
                    case 'Identifier':
                        addProperty(node.node, callExpression.callee.object.name, callExpression.callee.property);
                        break;
                    default:
                        debugger;
                        unimplemented();
                }
                break;
            default:
                debugger;
                unimplemented();
        }
    });
});

let interfaces = properties.map(scope => ({
    scope,
    interfaceDeclaration: scope.objects.map(object => {
        return `${scope.name}: ${convertPropertiesToInterface(object.properties)}`;
    })
}));

console.log(_.join(interfaces.map(x => x.interfaceDeclaration), '\n\n'));

debugger;
