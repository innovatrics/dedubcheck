# Dedubcheck

This tool check your monorepo for diferent versions of the same dependencies (by recursively looking for `package.json` file).

To ignore certain package, create `.dedubchek.js` file:

```javascript
module.exports = [['<path-to-package.json>', '<name-of-package>'], [...], [...]];
```

To run this thing, just do:

```bash
$ dedubcheck
```
