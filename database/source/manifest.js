{
  "name": "nodejsshim",
  "version": "1.0.0-beta.2",
  "comment": "xTuple ERP Node.js shims for the Qt Script Engine.",
  "loadOrder": 10,
  "defaultSchema": "nodejsshim",
  "databaseScripts": [
    "prerequisite.sql",

    "package.sql",
    "nodejsshim/schema/nodejsshim.sql",
    "nodejsshim/tables/node_modules.sql",
    "nodejsshim/functions/npm_install.sql",

    "nodejsshim/tables/pkgscript/core-js.js",
    "nodejsshim/tables/pkgscript/initMenu.js",
    "nodejsshim/tables/pkgscript/nodejsshim.js",
    "nodejsshim/tables/pkgscript/nodeJsConsole.js",
    "nodejsshim/tables/pkgscript/require.js",

    "nodejsshim/tables/pkguiform/nodeJsConsole.ui",

    "nodejsshim/src/buffer-qtscript/dist/buffer.qtscript.sql",
    "nodejsshim/src/child_process-qtscript/dist/child_process.qtscript.sql",
    "nodejsshim/src/crypto-qtscript/dist/crypto.qtscript.sql",
    "nodejsshim/src/dns-qtscript/dist/dns.qtscript.sql",
    "nodejsshim/src/fs-qtscript/dist/fs.qtscript.sql",
    "nodejsshim/src/http-qtscript/dist/http.qtscript.sql",
    "nodejsshim/src/https-qtscript/dist/https.qtscript.sql",
    "nodejsshim/src/net-qtscript/dist/net.qtscript.sql",
    "nodejsshim/src/_stream_transform-qtscript/dist/_stream_transform.qtscript.sql",
    "nodejsshim/src/timers-qtscript/dist/timers.qtscript.sql",
    "nodejsshim/src/ws-qtscript/dist/ws.qtscript.sql",

    "nodejsshim/lib/assert/dist/assert.sql",
    "nodejsshim/lib/buffer/dist/buffer.sql",
    "nodejsshim/lib/buffer-browserify/dist/buffer-browserify.sql",
    "nodejsshim/lib/events/dist/events.sql",
    "nodejsshim/lib/path/dist/path.sql",
    "nodejsshim/lib/process/dist/process.sql",
    "nodejsshim/lib/punycode/dist/punycode.sql",
    "nodejsshim/lib/querystring/dist/querystring.sql",
    "nodejsshim/lib/stream/dist/stream.sql",
    "nodejsshim/lib/string_decoder/dist/string_decoder.sql",
    "nodejsshim/lib/url/dist/url.sql",
    "nodejsshim/lib/util/dist/util.sql",

    "nodejsshim/node_modules/bluebird/dist/bluebird.sql",
    "nodejsshim/node_modules/json-mapper/dist/json-mapper.sql",
    "nodejsshim/node_modules/lodash/dist/lodash.sql",
    "nodejsshim/node_modules/sax/dist/sax.sql",
    "nodejsshim/node_modules/xmlbuilder/dist/xmlbuilder.sql"
  ]
}
