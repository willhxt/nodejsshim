#!/bin/bash

# The npm dependencies are npm modules that provide generatally useful features
# that do not exist in javasript environments like Qt Script. The npm modules
# built below are useful enough that xTuple includes them with this extenion,
# however, you are free to add and use other modules elsewhere. These are just
# included out of the box.

# Run browserify on all the npm dependencies in `../node_modules/` and export
# the bundled package to the `../foundation-database/nodejsshim/node_modules/`
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

build_bluebird () {
  echo "Building bluebird..."
  local PACKAGEPATH="bluebird"
  local PACKAGENAME="bluebird"
  local OUTPUTPATH="$DIR/../foundation-database/nodejsshim/node_modules/bluebird/dist/bluebird.sql"
  local SCHEMANAME="nodejsshim"
  local VERSION="3.4.0"
  local URL="https://github.com/petkaantonov/bluebird"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

build_json_mapper () {
  echo "Building json-mapper..."
  local PACKAGEPATH="json-mapper"
  local PACKAGENAME="json-mapper"
  local OUTPUTPATH="$DIR/../foundation-database/nodejsshim/node_modules/json-mapper/dist/json-mapper.sql"
  local SCHEMANAME="nodejsshim"
  local VERSION="0.0.10"
  local URL="https://github.com/dregenor/jsonMapper"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

build_lodash () {
  # TODO: Consider making this a cp from a lodash pre-built file from:
  # @See: https://github.com/lodash/lodash/blob/4.11.2-npm/core.js
  # And change these like to be similar to the core-js copy in build-polyfill.sh
  echo "Building lodash..."
  local PACKAGEPATH="lodash"
  local PACKAGENAME="lodash"
  local OUTPUTPATH="$DIR/../foundation-database/nodejsshim/node_modules/lodash/dist/lodash.sql"
  local SCHEMANAME="nodejsshim"
  local VERSION="4.17.4"
  local URL="https://github.com/lodash/lodash"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

build_sax () {
  echo "Building sax..."
  local PACKAGEPATH="sax"
  local PACKAGENAME="sax"
  local OUTPUTPATH="$DIR/../foundation-database/nodejsshim/node_modules/sax/dist/sax.sql"
  local SCHEMANAME="nodejsshim"
  local VERSION="1.2.4"
  local URL="https://github.com/isaacs/sax-js"

  build_browserify_command "$PACKAGEPATH" "$PACKAGENAME" "$OUTPUTPATH" "$SCHEMANAME" "$VERSION" "$URL" "--bare"
}

build_xmlbuilder () {
  echo "Building xmlbuilder..."
  local PACKAGEPATH="xmlbuilder"
  local PACKAGENAME="xmlbuilder"
  local OUTPUTPATH="$DIR/../foundation-database/nodejsshim/node_modules/xmlbuilder/dist/xmlbuilder.sql"
  local SCHEMANAME="nodejsshim"
  local VERSION="8.2.2"
  local URL="https://github.com/oozcitak/xmlbuilder-js"

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

# Build all npm dependencies.
echo "##############################"
echo "# Building npm dependencies..."
echo "##############################"
build_bluebird
build_json_mapper
build_lodash
build_sax
build_xmlbuilder
