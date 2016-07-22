#!/bin/bash

# Build the core-js javascript polyfill which adds ES5 bug fixes and ES5
# features to Qt Script. All we do is copy the npm core-js package's build to
# our local `../database/source/nodejsshim/tables/pkgscript/core-js` directory.
# At some point, we might need a custom build of core-js, which is possible.
#
# The core-js javascript polyfill can then be loaded with:
#
#  include('core-js');
#
# Since it overrites globals and doesn't return anything, `require('core-js');`
# should not be used. Use `include('core-js');` instead.
#
# @See: https://github.com/zloirock/core-js

build_core_js () {
  echo "Building core-js..."
  local PACKAGEPATH="$DIR/../node_modules/core-js/client/shim.js"
  local OUTPUTPATH="$DIR/../database/source/nodejsshim/tables/pkgscript/core-js.js"

  cp $PACKAGEPATH $OUTPUTPATH
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
echo "#######################"
echo "# Building polyfills..."
echo "#######################"
build_core_js
