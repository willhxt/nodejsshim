/* This file is part of the Node.js shims extension package for xTuple ERP, and is
 * Copyright (c) 1999-2016 by OpenMFG LLC, d/b/a xTuple.
 * It is licensed to you under the xTuple End-User License Agreement
 * ("the EULA"), the full text of which is available at www.xtuple.com/EULA
 * While the EULA gives you access to source code and encourages your
 * involvement in the development process, this Package is not free software.
 * By using this software, you agree to be bound by the terms of the EULA.
 */

include('nodejsshim');

/*
 * Some example code that users the Node.js Shim.
 */
function exampleHttpGet () {
  var http = require('http');

  var options = {
    hostname: 'www.google.com',
    path: '/'
  };

  startQueryTimer = new Date().getTime();
  var req = http.get(options, function (res) {
    res.on('data', function (chunk) {
      console.log("STATUS: ", res.statusCode);
      console.log("STATUS MESSAGE: ", res.statusMessage);
      //console.log("HEADERS: ", JSON.stringify(res.headers));
      //console.log("BODY: ", chunk);
    });
    res.on('end', function () {
      console.log('No more data in response.');
      console.log('Execution time: ' + ((new Date().getTime()) - startQueryTimer));
    })
  });
}

/*
 * Some example code that users the Node.js Shim.
 */
function exampleHttpRequest () {
  var http = require('http');

  var options = {
    hostname: 'www.google.com',
    path: '/'
  };

  startQueryTimer = new Date().getTime();
  var req = http.request(options, function (res) {
    res.on('data', function (chunk) {
      console.log("STATUS: ", res.statusCode);
      console.log("STATUS MESSAGE: ", res.statusMessage);
      //console.log("HEADERS: ", JSON.stringify(res.headers));
      //console.log("BODY: ", chunk);
    });
    res.on('end', function () {
      console.log('No more data in response.');
      console.log('Execution time: ' + ((new Date().getTime()) - startQueryTimer));
    })
  });

  req.end();
}

/*
 * Test QTcpServer
 */
function exampleTcpServer () {
  var net = require('net');

  var options = {
    port: 1234,
    host: '127.0.0.1'
  };
  var server = net.createServer(function (clientSocket) {
    clientSocket.end("hello world!");
  });

  server.listen(options, function () {
    console.log('QTcpServer listening on ' + options.host + '::' + options.port);
  });
}

/*
 * Test http.Server
 */
function exampleHttpServer () {
  var http = require('http');

  var options = {
    port: 1234,
    host: '127.0.0.1'
  };
  var server = http.createServer(function (req, res) {
    if (req.url === '/') {
      var html = '<html><head><title>xTuple exampleHttpServer</title></head><body><h1>It Works!</h1></body></html>';
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(html);
    } else {
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('ok');
    }
  });

  server.on('error', function (err) {
    if (err) {
      console.log("Error: " + err.message);
    }
  });

  server.listen(options, function () {
    console.log('http.Server listening on ' + options.host + '::' + options.port);
    setTimeout(function () {
      toolbox.openUrl('http://' + options.host + ':' + options.port + '/');
    }, 50);
  });
}

/*
 * Test XT.dataSource.query
 */
function exampleXTdataSourceQuery () {
  var sql = "SELECT cust_id FROM custinfo WHERE cust_number = $1;";
  var options = {
    parameters: ["TTOYS"]
  };

  function callback (queryError, result) {
    if (queryError) {
      console.error(queryError.message);
    } else {
      console.log(JSON.stringify(result));
    }
  }

  XT.dataSource.query(sql, options, function (queryError, result) {
    if (callback) {
      if (!queryError) {
        callback(null, result);
      } else {
        callback(queryError, result);
      }
    }
  });
}

/*
 * Test Promise.
 */
function examplePromise () {
  function doSomething() {
    return new Promise(function (resolve) {
      var value = 42;

      // Simulate async call.
      setTimeout(function() {
        resolve(value);
      }, 100);
    });
  }

  function doSomethingElse(value) {
    return new Promise(function (resolve) {
      // Simulate async call.
      setTimeout(function() {
        resolve("did something else with " + value);
      }, 100);
    });
  }

  // Note: QtScriptEngine JavaScript parsing throws a parse error on the
  // chained use of the keywork `catch` for some reason. e.g.
  //   `myPromise.then(...).catch(...);`
  // So we use the object key index pattern for `catch`. e.g.
  //   `myPromise.then(...)["catch"](...);`
  // You can also use `caught` when using the Bluebird library for Promise. e.g.
  //   `myPromise.then(...).caught(...);`
  doSomething().then(function (firstResult) {
    console.log("first result:", firstResult);
    return doSomethingElse(firstResult);
  }).then(function (secondResult) {
    console.log("second result:", secondResult);
    return secondResult;
  }).then(function (thirdResult) {
    console.log("third result passed message: ", thirdResult);
    var message = "Did something that errors. message = " + thirdResult;
    throw new Error(message);
  })["catch"](console.log.bind(console));
}

//var wrapper = exampleHttpGet;
//var wrapper = exampleHttpRequest;
//var wrapper = exampleTcpServer;
var wrapper = exampleHttpServer;
//var wrapper = exampleXTdataSourceQuery;
//var wrapper = examplePromise;

wrapper();
