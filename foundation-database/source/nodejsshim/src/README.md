This `src` directory contains the source of custom javascript libraries that
wrap or emulate Node.js builtins and packages for Qt Script. All the
subdirectories here rely on some Qt objects that xTuple has exposed to Qt Script
such as `QNetworkReply` being used in the `http` package.

All file names that include `qtscript` (e.g. `client-request.qtscript.js`)
implies that file contains Qt objects only found in xTuple Qt Script environment.
Those files will not work in other javascript environments.

Each subdirectory contains two directories, `dist` and `lib`. The `lib` directory
contains the actual custom package code. The `dist` directory contains a
browserify bundle of that `lib` directory, wrapped in an SQL query to add it to
the `nodejsshim.node_modules` table in xTuple's database. To create the `dist`
bundle, see the `build-local-builtins.sh` script located in the root `script`
directory. To recreate these bundles, run `npm run build-local-builtins` from
the root of this repo.
