#!/bin/bash

# The external builtins are browserify npm modules that duplicate Node.js
# builtin modules that do not exist in other javasript environments like Qt Script.
# Some browserify builtins work fine in Qt Script, so we use these external
# packages. Others require Qt specific code to work which is implemented in the
# `lib` directory and referred to as "local builtins".

# Run browserify on all the external builtins in `../node_modules/` and export
# the bundled package to their respective `../foundation-database/nodejsshim/lib/`
# directories. These bundles can then be inserted into the database and loaded with:
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

build_assert () {
  echo "Building assert..."
  local PACKAGEPATH="assert"
  local PACKAGENAME="assert"
  local OUTPUTPATH="$DIR/../foundation-database/nodejsshim/lib/assert/dist/assert.sql"
  local SCHEMANAME="nodejsshim"
  local VERSION="1.3.0"
  local URL="https://github.com/defunctzombie/commonjs-assert"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

build_buffer () {
  # Note: This shim for Buffer works, but is slower. There is also a Buffer
  # shim in local builtins that is a wrapper around QByteArray that is faster.
  echo "Building Buffer..."
  local PACKAGEPATH="buffer"
  local PACKAGENAME="buffer"
  local OUTPUTPATH="$DIR/../foundation-database/nodejsshim/lib/buffer/dist/buffer.sql"
  local SCHEMANAME="nodejsshim"
  local VERSION="4.6.0"
  local URL="https://github.com/feross/buffer"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

build_buffer_browserify () {
  # Note: This shim for Buffer works, but is slower. There is also a Buffer
  # shim in local builtins that is a wrapper around QByteArray that is faster.
  echo "Building Buffer-browserify..."
  local PACKAGEPATH="buffer-browserify"
  local PACKAGENAME="buffer-browserify"
  local OUTPUTPATH="$DIR/../foundation-database/nodejsshim/lib/buffer-browserify/dist/buffer-browserify.sql"
  local SCHEMANAME="nodejsshim"
  local VERSION="0.2.5"
  local URL="https://github.com/toots/buffer-browserify"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

build_events () {
  echo "Building events..."
  local PACKAGEPATH="events"
  local PACKAGENAME="events"
  local OUTPUTPATH="$DIR/../foundation-database/nodejsshim/lib/events/dist/events.sql"
  local SCHEMANAME="nodejsshim"
  local VERSION="1.1.0"
  local URL="https://github.com/Gozala/events"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

build_http_parser () {
  echo "Building http-parser..."
  local PACKAGEPATH="http-parser-js"
  local PACKAGENAME="http-parser"
  local OUTPUTPATH="$DIR/../foundation-database/nodejsshim/lib/http-parser/dist/http-parser.sql"
  local SCHEMANAME="nodejsshim"
  local VERSION="0.4.2"
  local URL="https://github.com/creationix/http-parser-js"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

build_path () {
  echo "Building path..."
  local PACKAGEPATH="path"
  local PACKAGENAME="path"
  local OUTPUTPATH="$DIR/../foundation-database/nodejsshim/lib/path/dist/path.sql"
  local SCHEMANAME="nodejsshim"
  local VERSION="0.12.7"
  local URL="https://github.com/jinder/path"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

build_process () {
  echo "Building process..."
  local PACKAGEPATH="process"
  local PACKAGENAME="process"
  local OUTPUTPATH="$DIR/../foundation-database/nodejsshim/lib/process/dist/process.sql"
  local SCHEMANAME="nodejsshim"
  local VERSION="0.11.2"
  local URL="https://github.com/shtylman/node-process"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

build_punycode () {
  echo "Building punycode..."
  local PACKAGEPATH="punycode"
  local PACKAGENAME="punycode"
  local OUTPUTPATH="$DIR/../foundation-database/nodejsshim/lib/punycode/dist/punycode.sql"
  local SCHEMANAME="nodejsshim"
  local VERSION="1.4.1"
  local URL="https://github.com/bestiejs/punycode"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

build_querystring () {
  echo "Building querystring..."
  local PACKAGEPATH="querystring-es3"
  local PACKAGENAME="querystring"
  local OUTPUTPATH="$DIR/../foundation-database/nodejsshim/lib/querystring/dist/querystring.sql"
  local SCHEMANAME="nodejsshim"
  local VERSION="0.2.1"
  local URL="https://github.com/mike-spainhower/querystring"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

build_stream () {
  echo "Building stream..."
  local PACKAGEPATH="stream-browserify"
  local PACKAGENAME="stream"
  local OUTPUTPATH="$DIR/../foundation-database/nodejsshim/lib/stream/dist/stream.sql"
  local SCHEMANAME="nodejsshim"
  local VERSION="2.0.1"
  local URL="https://github.com/substack/stream-browserify"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

build_string_decoder () {
  echo "Building string_decoder..."
  local PACKAGEPATH="string_decoder"
  local PACKAGENAME="string_decoder"
  local OUTPUTPATH="$DIR/../foundation-database/nodejsshim/lib/string_decoder/dist/string_decoder.sql"
  local SCHEMANAME="nodejsshim"
  local VERSION="0.10.31"
  local URL="https://github.com/rvagg/string_decoder"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

build_url () {
  echo "Building url..."
  local PACKAGEPATH="url"
  local PACKAGENAME="url"
  local OUTPUTPATH="$DIR/../foundation-database/nodejsshim/lib/url/dist/url.sql"
  local SCHEMANAME="nodejsshim"
  local VERSION="0.11.0"
  local URL="https://github.com/defunctzombie/node-url"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

build_util () {
  echo "Building util..."
  local PACKAGEPATH="util"
  local PACKAGENAME="util"
  local OUTPUTPATH="$DIR/../foundation-database/nodejsshim/lib/util/dist/util.sql"
  local SCHEMANAME="nodejsshim"
  local VERSION="0.10.3"
  local URL="https://github.com/defunctzombie/node-util"

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

# Build all external builtins.
echo "###############################"
echo "# Building external builtins..."
echo "###############################"
build_assert
build_buffer
build_buffer_browserify
build_events
build_http_parser
build_path
build_process
build_punycode
build_querystring
build_stream
build_string_decoder
build_url
build_util
