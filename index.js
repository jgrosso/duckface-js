'use strict';

const DEBUG_RUN = true;

const fs = require('fs');
const childProcess = require('child_process');

const Acorn = require('acorn');
const _ = require('lodash');

const unimplemented = () => {
    if (!DEBUG_RUN) {
        debugger;
        throw new Error('TODO');
    }
};

const isFunctionDeclaration = node => {
    return parseTopLevelStatement(node) !== null;
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
            unimplemented();
            return null;
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
const convertPropertiesToInterface = (parameterName, properties) => {
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

    return {
        declaration: `
            interface ${randomInterfaceName} {
                ${interfaceBody}
            }
        `,
        name: randomInterfaceName,
        parameterName
    };
};

const findFunction = node => {
    switch (node.type) {
        case 'FunctionExpression':
            return node;
        case 'FunctionDeclaration':
            return node;
        case 'VariableDeclaration':
            return node.declarations[0].init;
        default:
            unimplemented();
    }
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

let source = `
    function x(test) {
        return test.toString();
    };
    var x = function(test) {
        return test.toString2();
    };
    var y = function y(test) {
        return toString(test.test);
    };
    var toString = function (test) {
        return test.toString2;
    };
    y({
        test: {
            toString3: () => "1"
        }
    })();
`;
let comments = [];
let ast = Acorn.parse(source, {
    onComment: comments
}).body.filter(isFunctionDeclaration);

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
                        unimplemented();
                }
                break;
            default:
                unimplemented();
        }
    });
});

let interfaces = properties.map(scope => {
    return scope.objects.map(x => ({
        scope,
        interfaceDeclaration: convertPropertiesToInterface(x.name, x.properties)
    }));
});

let newCharactersLength = 0;
properties.forEach(scope => {
    let interfaceAnnotation = _.find(interfaces, x => x[0].scope == scope)[0].interfaceDeclaration;
    let interfaceAnnotationText = `: ${interfaceAnnotation.name}`;
    let parameterEnd = _.find(findFunction(scope.node).params, x => x.name == interfaceAnnotation.parameterName).end + newCharactersLength;
    source = source.slice(0, parameterEnd) + interfaceAnnotationText + source.slice(parameterEnd);
    newCharactersLength += interfaceAnnotationText.length;
});

source += '\n' + _.join(interfaces.map(x => x[0].interfaceDeclaration.declaration), '\n');
source = `
    // @flow
    ${source}
`;

const outputPath = 'bin/convertedSource.js';
fs.unlink(outputPath);
fs.writeFile(outputPath, source, err => {
    if (err) {
        return console.error(err);
    }
    
    childProcess.exec('cat bin/convertedSource.js | node_modules/.bin/flow check-contents', (error, stdout, stderr) => {
        console.log(stdout);
        console.error(stderr);
        if (error !== null) {
            console.error(`exec error: ${error}`);
        }
    });
});
