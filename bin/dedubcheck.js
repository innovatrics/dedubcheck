#!/usr/bin/env node
// @flow weak
const fs = require('fs');
const path = require('path');
const pick = require('lodash/pick');

const currentDir = path.resolve(process.cwd());
const IGNORE_PATTERN = /\/node_modules|\/.reg|\/.git|\/.vscode|\/flow-stub|\/flow-typed|\/build|\/coverage/g;

let exceptions;

try {
  // eslint-disable-next-line
  exceptions = require(path.join(currentDir, '.dedupcheck'));
} catch (e) {
  exceptions = [];
}

function getPackageJsonFiles(dir) {
  return fs.readdirSync(dir).reduce((files, file) => {
    const name = path.join(dir, file);
    const isDirectory = fs.statSync(name).isDirectory();
    const isIgnored = IGNORE_PATTERN.test(name);
    if (isDirectory && !isIgnored) {
      return [...files, ...getPackageJsonFiles(name)];
    }
    return /\/package.json/g.test(name) ? [...files, name] : [...files];
  }, []);
}
const files = getPackageJsonFiles(currentDir);
const dependencyObject = files.reduce((acc, curr) => {
  const file = fs.readFileSync(curr).toString();
  const json = JSON.parse(file);
  return {
    [curr]: {
      ...pick(json, ['dependencies', 'devDependencies', 'peerDependencies']),
    },
    ...acc,
  };
}, {});
const testObject = {};

Object.keys(dependencyObject).forEach(packageJson => {
  const dep = dependencyObject[packageJson];
  Object.keys(dep).forEach(key => {
    Object.keys(dep[key]).forEach(depName => {
      const version = dep[key][depName];
      if (testObject[depName] != null) {
        if (version !== testObject[depName]) {
          process.exitCode = 1;
          throw new Error(`Dependency ${depName} has diferent versions: ${testObject[depName]} !== ${version}`);
        }
      }
      const exception = exceptions.find(value => path.resolve(value[0]) === packageJson);
      if (exception != null) {
        testObject[exception[1]] = null;
      }
      testObject[depName] = version;
    });
  });
});
