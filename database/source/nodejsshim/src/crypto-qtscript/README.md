# crypto

This is an emulation of Node.js's `crypto` package. It wraps Qt's crypto objects:
 * QtAlgorithm
 * QCryptographicHash

Not all `crypto` features can be supported in Qt, so some methods are just a [JavaScript sham](http://stackoverflow.com/q/27508833/251019) to prevent errors.

##See original source here:
[crypto](https://github.com/nodejs/node/blob/v4.4.2/lib/crypto.js)
