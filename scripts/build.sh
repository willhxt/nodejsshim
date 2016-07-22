#!/bin/bash

# Build everything for the Qt Script Node.js Shim.
build () {
  echo "+-------------------------------------------------------------------------------"
  echo "+ Starting Build..."
  echo "+-------------------------------------------------------------------------------"

  $DIR/build-polyfill.sh
  $DIR/build-local-builtins.sh
  $DIR/build-external-builtins.sh
  $DIR/build-npm-dependencies.sh

  echo "+-------------------------------------------------------------------------------"
  echo "+ Build complete."
  echo "+-------------------------------------------------------------------------------"
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

build
