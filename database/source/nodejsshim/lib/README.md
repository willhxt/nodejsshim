This `lib` directory contains browserify bundles of popular Node.js builtins
that are required to emulate a Node.js environment in Qt Script.

Each subdirectory contains one directories, `dist`. The `dist` directory contains
a browserify bundle of that package from the `node_modules` directory at the
root of this repo, wrapped in an SQL query to add it to the
`nodejsshim.node_modules` table in xTuple's database. To create the `dist`
bundle, see the `build-external-builtins.sh` script located in the root `script`
directory. To recreate these bundles, run `npm install` followed by
`npm run build-external-builtins` from the root of this repo.
