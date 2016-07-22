This `scripts` directory contain bash scripts that build all the necessary
files for the `nodejsshim` xTuple Extension Package. These scripts can be ran
from the root of this repo using `npm run script-name-here`. See the
`package.json` `scripts` section.

There are two main scripts to rebuild everyting:
  * `build.sh` - Bundles all Node.js builtins and NPM packages in browserify bundles
  * `build-release-package.sh` - Creates the `nodejsshim.gz` xTuple Extension Package
