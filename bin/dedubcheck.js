#!/usr/bin/env node
// @flow weak

/* eslint-disable no-console */

const isDebug = process.argv.includes('--debug');
if (isDebug) {
  console.log('dedubcheck starts');
}

const fs = require('fs');
const path = require('path');
const pick = require('lodash/pick');

const currentDir = path.resolve(process.cwd());
// AWARE: Do NOT use 'g' in regexp, as regex object will save state between calls
const IGNORE_PATTERN = /(\/|\\)node_modules$|(\/|\\)\.reg$|(\/|\\)\.git$|(\/|\\)\.vscode$|(\/|\\)flow-stub$|(\/|\\)flow-typed$|(\/|\\)build$|(\/|\\)coverage$/i;

let exceptions;

try {
  if (isDebug) {
    console.log(`Looking for ".dedubcheck" exceptions file at: ${path.join(currentDir, '.dedubcheck')}`);
  }

  // eslint-disable-next-line
  exceptions = require(path.join(currentDir, '.dedubcheck'));

  if (isDebug) {
    console.log('Exceptions loaded:');
    console.dir(exceptions);
  }
} catch (e) {
  if (isDebug) {
    console.log('".dedubcheck" not found');
  }
  exceptions = [];
}

function getPackageJsonFiles(dir) {
  return fs.readdirSync(dir).reduce((files, file) => {
    const name = path.join(dir, file);
    const statSync = fs.statSync(name);
    const isDirectory = statSync.isDirectory();
    const isSymbolicLink = statSync.isSymbolicLink();
    const isIgnored = IGNORE_PATTERN.test(name);
    if (isDirectory && !isSymbolicLink && !isIgnored) {
      return [...files, ...getPackageJsonFiles(name)];
    }
    return /(\/|\\)package.json$/g.test(name) ? [...files, name] : [...files];
  }, []);
}
const files = getPackageJsonFiles(currentDir);
if (isDebug) {
  console.log('Parsing files:', files);
}

const dependencyObject = files.reduce((acc, curr) => {
  const file = fs.readFileSync(curr).toString();
  const json = JSON.parse(file);
  return {
    [curr]: {
      ...pick(json, ['dependencies', 'devDependencies']),
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
          // We have found a problem...
          // ...but first we'll check if it is not an exception
          const hasException = exceptions.some(exception => {
            if (path.resolve(exception[0]) === packageJson && exception[1] === depName) {
              if (isDebug) {
                console.log(`Exception found: '${depName}' at '${exception[0]}'. We'll not report it as error.`);
              }
              return true;
            }
            return false;
          });

          if (hasException === false) {
            process.exitCode = 1;
            throw new Error(
              `Dependency '${depName}' has diferent versions: '${
                testObject[depName]
              }' !== '${version}' (in ${packageJson})`,
            );
          }
        }
      }
      testObject[depName] = version;
    });
  });
});
