/**
 * To create a bundle that works with this require function:
 *
 *   browserify -r ./my-file-here.js:package-name-to-use-here > ./some-path/some-file.js
 *   browserify -r ./lib/xmlbuilder.js:xmlbuilder > ./dist/xmlbuilder.js
 *
 * Consider using the `--no-builtins` and `--bare` flags if any required builtin
 * node modules like `Buffer` are added a different way to the JS Engine.
 *
 *   browserify --no-builtins --bare -r ./lib/sax.js:sax > ./dist/sax.js
 *
 * Then in Qt Script code, you can do:
 *
 *   var myPackage = require('package-name-to-use-here');
 *   var xmlbuilder = require('xmlbuilder');
 *
 * This code is a modifed version of browserify's `require` wrapper. To better
 * understand how it works:
 * @See:https://github.com/substack/browser-pack/blob/v6.0.1/prelude.js
 */

// modules are defined as an array
// [ module function, map of requireuires ]
//
// map of requireuires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the requireuire for previous bundles
require=(function outer (modules, cache, entry) {
    // Save the require from previous bundle to this closure if any
    var previousRequire = typeof require == "function" && require;

    function newRequire(name, jumped){
        if(!cache[name]) {
            if(!modules[name]) {
              // TODO: Paths of any depth are not supported because we have no way to
              // figure out the relative path based on where `require()` is called.
              // The `nodejsshim.node_modules` table does have a `node_modules_path`
              // column for this if support can be added in the future.

              // For now, this function will just look for a file/scirpt matching the
              // end of the path. If you require loading a specific file from a path,
              // it is better to just browserify the whole package into one file and
              // ensure its exports expose what is needed.
              var path = name;
              var pathParts = path.split("/");
              var pathFile = pathParts.filter(function findLastPathFile (part, index) {
                return index === (pathParts.length - 1);
              }).shift();

              var extensions = [
                "js",
                "json",
                "node"
              ];
              var fileNameParts = pathFile.split(".");
              var fileName = fileNameParts.filter(function findFileName (part, index) {
                if (fileNameParts.length === 1) {
                  // Handles require("myModule");
                  return true;
                } else if (index < (fileNameParts.length - 1)) {
                  // Handles `myModule.something.anything` of require("myModule.something.anything.js");
                  return true;
                } else if ((extensions.indexOf(part) === -1)) {
                  // Handles `myModule.something.anything` for require("myModule.something.anything");
                  return true;
                } else {
                  // Handles `js` of require("myModule.something.anything.js");
                  return false;
                }
              }).join(".");

              var params = {
                package_name: [fileName]
              };
              var loader = toolbox.executeQuery(
                "SELECT node_modules_package_name AS name,\n" +
                "  node_modules_code AS code\n" +
                "FROM nodejsshim.node_modules\n" +
                "WHERE node_modules_package_name = <? value('package_name') ?>",
                params
              );

              if (loader.numRowsAffected() > 1) {
                throw new Error("More than one script file found for package: " + fileName);
              }

              if (loader.first()) {
                return (function () {
                  var exports = {};
                  var module = {
                    exports: false
                  };

                  engineEvaluate(loader.value("code"), fileName);

                  if (!module.exports) {
                    // If `module.exports` does not exist, this is a browserify package.
                    // Call `require(fileName)` again as it should now be in the cache.
                    var bundle = require(fileName);
                    return bundle;
                  } else {
                    // The code is not a browserify package. Just return it's exports.
                    return module.exports;
                  }
                })();
              } else {
                // if we cannot find the module within our internal map or
                // cache jump to the current global require ie. the last bundle
                // that was added to the page.
                var currentRequire = typeof require == "function" && require;
                if (!jumped && currentRequire) return currentRequire(name, true);

                // If there are other bundles on this page the require from the
                // previous one is saved to 'previousRequire'. Repeat this as
                // many times as there are bundles until the module is found or
                // we exhaust the require chain.
                if (previousRequire) return previousRequire(name, true);
                var err = new Error('Cannot find module \'' + name + '\'');
                err.code = 'MODULE_NOT_FOUND';
                throw err;
              }
            }
            var m = cache[name] = {exports:{}};
            modules[name][0].call(m.exports, function(x){
                var id = modules[name][1][x];
                return newRequire(id ? id : x);
            },m,m.exports,outer,modules,cache,entry);
        }
        return cache[name].exports;
    }
    for(var i=0;i<entry.length;i++) newRequire(entry[i]);

    // Override the current require with this new one
    return newRequire;
})({}, {}, []);
