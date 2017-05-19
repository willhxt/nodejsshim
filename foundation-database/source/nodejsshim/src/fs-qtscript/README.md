# fs

This is an emulation of Node.js's `fs` package. It wraps Qt's filesystem objects:
 * TODO QDir
 * TODO QFile

TODO: Use `QDir` and `QFile` to emulate the `fs` package.
Not all `fs` features can be supported in Qt, so some methods are just a [JavaScript sham](http://stackoverflow.com/q/27508833/251019) to prevent errors.

##See original source here:
[fs](https://github.com/nodejs/node/blob/v4.4.2/lib/fs.js)
