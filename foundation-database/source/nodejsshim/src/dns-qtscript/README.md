# dns

This is an emulation of Node.js's `dns` package. It wraps Qt's QDnsLookup object.

Not all `dns` features can be supported in Qt, so some methods are just a [JavaScript sham](http://stackoverflow.com/q/27508833/251019) to prevent errors.

##See original source here:
[dns](https://github.com/nodejs/node/blob/v4.4.2/lib/dns.js)
