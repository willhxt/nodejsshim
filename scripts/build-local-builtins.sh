#!/bin/bash

# The local builtins are custom Qt Script javascript code that duplicate Node.js
# builtin modules that do not exist in other javasript environments like Qt Script.
# Some browserify builtins work fine in Qt Script, so we use those external
# packages and refer to them as "external builtins". Others require Qt specific
# code to work which is implemented here and referred to as "local builtins".

# Run browserify on all the local builtins in `../database/source/nodejsshim/src/`
# and export the bundled package to their respective `dist` directories. These
# bundles can then be inserted into the database and loaded with:
#
#   `var myPackage = require('package-name-here');`
#
# The `--bare` flag is used to skip adding Node.js's builtin packages
# like `util` to the bundle. If the code being bundled requires one of Node.js's
# builtin packages, make sure that package works in Qt Script and has been
# added to the database when using the `--bare` flag. This allows us to
# share the builtin package across multiple packages instead of duplicating it
# in each package. The `--bare` flag can be skipped, but the resulting
# bundle may include several builtin packages and be larger than necessary.
#
# @See: https://github.com/substack/node-browserify
VERSION=$(awk '/version *=/ { split($$0, ary, "[\"= ]*");       \
                              for (i in ary) {                  \
                                if (ary[i] == "version") {      \
                                  print ary[i + 1] ; exit;      \
                                } } }' $DIR/../database/source/package.xml)
SCHEMANAME=$(awk '/name *=/ { split($$0, ary, "[\"= ]*");       \
                              for (i in ary) {                  \
                                if (ary[i] == "name") {         \
                                  print ary[i + 1] ; exit;      \
                                } } }' $DIR/../database/source/package.xml)
URL="https://github.com/xtuple/qt-script-node-js-shims"

build_buffer_qt () {
  # Note: This is a wrapper around QByteArray. There is also a Buffer shim in
  # external builtins that work differently, but is slower.
  echo "Building Buffer-qt..."
  local PACKAGEPATH="$DIR/../database/source/nodejsshim/src/buffer-qtscript/lib/index.qtscript.js"
  local PACKAGENAME="buffer-qt"
  local OUTPUTPATH="$DIR/../database/source/nodejsshim/src/buffer-qtscript/dist/buffer.qtscript.sql"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

build_child_process () {
  echo "Building child_process..."
  local PACKAGEPATH="$DIR/../database/source/nodejsshim/src/child_process-qtscript/lib/index.qtscript.js"
  local PACKAGENAME="child_process"
  local OUTPUTPATH="$DIR/../database/source/nodejsshim/src/child_process-qtscript/dist/child_process.qtscript.sql"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

build_crypto () {
  echo "Building crypto..."
  local PACKAGEPATH="$DIR/../database/source/nodejsshim/src/crypto-qtscript/lib/index.qtscript.js"
  local PACKAGENAME="crypto"
  local OUTPUTPATH="$DIR/../database/source/nodejsshim/src/crypto-qtscript/dist/crypto.qtscript.sql"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

build_dns () {
  echo "Building dns..."
  local PACKAGEPATH="$DIR/../database/source/nodejsshim/src/dns-qtscript/lib/index.qtscript.js"
  local PACKAGENAME="dns"
  local OUTPUTPATH="$DIR/../database/source/nodejsshim/src/dns-qtscript/dist/dns.qtscript.sql"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

build_fs () {
  echo "Building fs..."
  local PACKAGEPATH="$DIR/../database/source/nodejsshim/src/fs-qtscript/lib/index.qtscript.js"
  local PACKAGENAME="fs"
  local OUTPUTPATH="$DIR/../database/source/nodejsshim/src/fs-qtscript/dist/fs.qtscript.sql"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

build_http () {
  echo "Building http..."
  local PACKAGEPATH="$DIR/../database/source/nodejsshim/src/http-qtscript/lib/index.qtscript.js"
  local PACKAGENAME="http"
  local OUTPUTPATH="$DIR/../database/source/nodejsshim/src/http-qtscript/dist/http.qtscript.sql"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

# TODO: We just rename http to https for now.
build_https () {
  echo "Building https..."
  local PACKAGEPATH="$DIR/../database/source/nodejsshim/src/http-qtscript/lib/index.qtscript.js"
  local PACKAGENAME="https"
  local OUTPUTPATH="$DIR/../database/source/nodejsshim/src/https-qtscript/dist/https.qtscript.sql"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

build_net () {
  echo "Building net..."
  local PACKAGEPATH="$DIR/../database/source/nodejsshim/src/net-qtscript/lib/index.qtscript.js"
  local PACKAGENAME="net"
  local OUTPUTPATH="$DIR/../database/source/nodejsshim/src/net-qtscript/dist/net.qtscript.sql"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

build_stream_transform () {
  echo "Building _stream_transform..."
  local PACKAGEPATH="$DIR/../database/source/nodejsshim/src/_stream_transform-qtscript/lib/index.qtscript.js"
  local PACKAGENAME="_stream_transform"
  local OUTPUTPATH="$DIR/../database/source/nodejsshim/src/_stream_transform-qtscript/dist/_stream_transform.qtscript.sql"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

build_timers () {
  echo "Building timers..."
  local PACKAGEPATH="$DIR/../database/source/nodejsshim/src/timers-qtscript/lib/index.qtscript.js"
  local PACKAGENAME="timers"
  local OUTPUTPATH="$DIR/../database/source/nodejsshim/src/timers-qtscript/dist/timers.qtscript.sql"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

build_ws () {
  # Note: This is not a Node.js builtin, but a Qt emulation of the `ws` NPM package.
  echo "Building ws..."
  local PACKAGEPATH="$DIR/../database/source/nodejsshim/src/ws-qtscript/lib/index.qtscript.js"
  local PACKAGENAME="ws"
  local OUTPUTPATH="$DIR/../database/source/nodejsshim/src/ws-qtscript/dist/ws.qtscript.sql"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

# Get current path of this file, no matter how it was called.
# @See: http://stackoverflow.com/a/246128/59087
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a symlink
  DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE" # if $SOURCE was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done
DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"

# Import helper script.
source $DIR/lib/helpers.sh

# Build all local builtins.
echo "############################"
echo "# Building local builtins..."
echo "############################"
build_buffer_qt
build_child_process
build_crypto
build_dns
build_fs
build_http
build_https
build_net
build_stream_transform
build_timers
build_ws
