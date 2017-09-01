/* This file is part of the Node.js shims extension package for xTuple ERP, and is
 * Copyright (c) 1999-2016 by OpenMFG LLC, d/b/a xTuple.
 * It is licensed to you under the xTuple End-User License Agreement
 * ("the EULA"), the full text of which is available at www.xtuple.com/EULA
 * While the EULA gives you access to source code and encourages your
 * involvement in the development process, this Package is not free software.
 * By using this software, you agree to be bound by the terms of the EULA.
 */

/*
 * Polyfill Node.js globals in Qt Script.
 */
include('require');
global = this;
process = require('process');

(function _timers() {
  var _timers = require("timers");
  clearImmediate = _timers.clearImmediate;
  clearInterval = _timers.clearInterval;
  clearTimeout = _timers.clearTimeout;
  setImmediate = _timers.setImmediate;
  setInterval = _timers.setInterval;
  setTimeout = _timers.setTimeout;
})();

/*
 * Polyfill missing ES5.1 features in Qt Script.
 */
if (typeof Object.assign != 'function') {
  // @See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign#Polyfill
  (function () {
    Object.assign = function (target) {
      'use strict';
      if (target === undefined || target === null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var output = Object(target);
      for (var index = 1; index < arguments.length; index++) {
        var source = arguments[index];
        if (source !== undefined && source !== null) {
          for (var nextKey in source) {
            if (source.hasOwnProperty(nextKey)) {
              output[nextKey] = source[nextKey];
            }
          }
        }
      }
      return output;
    };
  })();
}

if (typeof Object.preventExtensions != 'function') {
  // This function doesn't do anything. It's a "sham" to prevent an error when it's missing.
  (function () {
    Object.preventExtensions = function( obj ) {
      return obj;
    };
  })();
}

if (typeof Object.freeze != 'function') {
  // @See: http://stackoverflow.com/a/13117893/251019
  (function () {
    Object.freeze = function( obj ) {
      var props = Object.getOwnPropertyNames( obj );

      for ( var i = 0; i < props.length; i++ ) {
        var desc = Object.getOwnPropertyDescriptor( obj, props[i] );

        if ( "value" in desc ) {
          desc.writable = false;
        }

         desc.configurable = false;
         Object.defineProperty( obj, props[i], desc );
      }

      return Object.preventExtensions( obj );
    };
  })();
}

if (!Function.prototype.bind) {
  // @See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind#Polyfill
  Function.prototype.bind = function(oThis) {
    if (typeof this !== 'function') {
      // closest thing possible to the ECMAScript 5
      // internal IsCallable function
      throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
    }

    var aArgs   = Array.prototype.slice.call(arguments, 1),
        fToBind = this,
        fNOP    = function() {},
        fBound  = function() {
          return fToBind.apply(this instanceof fNOP
                 ? this
                 : oThis,
                 aArgs.concat(Array.prototype.slice.call(arguments)));
        };

    if (this.prototype) {
      // Function.prototype doesn't have a prototype property
      fNOP.prototype = this.prototype;
    }
    fBound.prototype = new fNOP();

    return fBound;
  };
}

/*
 * ############################################################################
 * The 'core-js' polyfill and the three different `Buffer` shims have various
 * performance impacts when used together. Test the various combinations when
 * picking which to use.
 * ############################################################################
 */

/**
 * Polyfill ES6 features and javascript engine bugs.
 * Note: This isn't required for most Node.js code to run, but adds ES6
 * features like Promises if needed. The 'core-js' polyfill can slow some code
 * down because Qt Script itself is a pretty old and slow javascript engine.
 */
//include('core-js');
// Note: `core-js` includes a `Promise` polyfill. Pick one or the other based on your needs.
Promise = require("bluebird");

/**
 * The Buffer wrapped around QByteArray:
 * See the note about `array index access` with this Buffer shim at:
 * @See: TODO: in the code for now.
 *
 * Note: This is the fastest Buffer shim if you don't need `array index access`
 * This is MUCH slower if 'core-js' is included anywhere.
 */
Buffer = require('buffer-qt').Buffer;

/**
 * The slower (than buffer-qt) default browserify Buffer shim:
 * Note: This is MUCH slower if 'core-js' is included before because it uses ArrayBuffer shim.
 */
//Buffer = require('buffer').Buffer;

/**
 * The slower (than buffer-qt) Buffer-browserify  shim:
 * Note: There is no performance impact when using 'core-js' with this Buffer.
 */
//Buffer = require('buffer-browserify').Buffer;

/**
 * Add xTuple global objects from xtuple/node-datasource.
 */
var XT = {
  dataSource: {}
};

/**
 * Emulate XT.dataSource.query using Qt Script `QSqlQuery()` instead of
 * `node-postgres`.
 * Note, this is synchronous, event loop blocking, query call. One day we'll
 * wrap XSqlQuery in a thread.
 *
 * @param {String} query - The SQL query to execute.
 * @param {Object | Function} queryOptions - The optional query options object or the callback function.
 * @param {Function} [queryCallback] - The function to call with the queries result.
 */
XT.dataSource.query = function (query, queryOptions, queryCallback) {
  var options = {};
  var response = {};
  var db;
  var dbConnectionName = "QTScript.XT.dataSource.query";

  if (typeof queryOptions === "object") {
    options = queryOptions;
  }
  if (typeof queryOptions === "function") {
    queryCallback = queryOptions;
  }

  // TODO: Support connection pool?

  // Create a new database connection if options are passed.
  if (options.user && options.password && options.database && (options.host || options.hostname) && options.port) {
    db = QSqlDatabase.database(dbConnectionName);
    if (!db.isValid()) {
      var connectOptions = "application_name='xTuple Qt Script XT.dataSource.query()'";
      var defaultDb = QSqlDatabase.database();
      var defaultConnectOptions = defaultDb.connectOptions();

      if (defaultConnectOptions.indexOf("requiressl=1") !== -1) {
        connectOptions = connectOptions + ";requiressl=1";
      }

      db = QSqlDatabase.addDatabase("QPSQL", dbConnectionName);
      db.setUserName(options.user);
      db.setPassword(options.password);
      db.setDatabaseName(options.database);
      db.setHostName(options.host || options.hostname);
      db.setPort(options.port);
      db.setConnectOptions(connectOptions);
      db.open();
    }
  }

  var placeholderRegex = /(\$[0-9]+)+/g;
  var placeholders = query.match(placeholderRegex);
  var sqlQuery = db ? new QSqlQuery(db) : new QSqlQuery();

  // Replace node-postgres/plv8 style `$n` placeholders with Qt `?` style.
  if (placeholders && placeholders.length > 0 && options.parameters.length > 0) {
    if (placeholders.length !== options.parameters.length) {
      queryCallback(new Error("SQL query placeholder and parameter count must be equal."), null);
      return;
    }

    query = query.replace(placeholderRegex, "?");
    sqlQuery.prepare(query);

    if (sqlQuery.lastError().type() !== 0) {
      var message = "Cannot QSqlQuery.prepare() query:\n" + query + "\n" + sqlQuery.lastError().text();
      console.error(message);
      queryCallback(new Error(message), null);
      return;
    }

    options.parameters.forEach(function (element, index) {
      sqlQuery.bindValue(index, element);

      if (sqlQuery.lastError().type() !== 0) {
        var message = "Cannot QSqlQuery.bindValue() for query:\n" + query + "\n" + sqlQuery.lastError().text();
        console.error(message);
        queryCallback(new Error(sqlQuery.lastError().text()), null);
        return;
      }
    });

    sqlQuery.exec();
  } else {
    sqlQuery.exec(query);
  }

  if (sqlQuery.lastError().type() !== 0) {
    var message = "Cannot QSqlQuery.exec() for query:\n" + query + "\n" + sqlQuery.lastError().text();
    console.error(message);
    queryCallback(new Error(sqlQuery.lastError().text()), null);
    return;
  }

  response.rowCount = sqlQuery.size();
  response.rows = [];
  response.status = {
    code: 200,
    message: "OK"
  };

  // Convert sqlQuery to JS object.
  while(sqlQuery.next()) {
    var record = sqlQuery.record();
    var columnCount = record.count();
    var row = {};

    for (var i = 0; i < columnCount; i++) {
      // TODO: Test conversion for various values. Do we need? QJsonValue.fromVariant(record.value(i))
      row[record.fieldName(i)] = record.value(i);
    }

    response.rows.push(row);
  }

  sqlQuery.clear();
  if (db && db.isOpen()) {
    db.close();
  }
  queryCallback(null, response);
};

/**
 * Emulate XT.dataSource.getAdminCredentials().
 *
 * @return {Object} - An emply placeholder object.
 */
XT.dataSource.getAdminCredentials = function getAdminCredentials (org) {
  // Qt Script's XT.dataSource.query() gets the database connection from the client.
  // We do not need to return anything here other than an empty object.
  return {};
};
