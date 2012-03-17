var vows   = require('vows')
  , assert = require('assert')
  , http   = require('http')
  , Client = require('../lib/client')

vows.describe('Client').addBatch({
  //////////////////////////////////////////////////////////////////////
  // Test Constructor functionality
  //////////////////////////////////////////////////////////////////////
  'A constructor' : {
    // Test standard Client initialization
    'with URI options only' : {
      topic: function () {
        var client = new Client({ host: 'localhost', port: 9999, path: '/'}, false)
        return client.options
      }
    , 'contains the standard headers' : function (topic) {
        var headers = {
          'User-Agent': 'NodeJS XML-RPC Client'
        , 'Content-Type': 'text/xml'
        , 'Accept': 'text/xml'
        , 'Accept-Charset': 'UTF8'
        , 'Connection': 'Keep-Alive'
        }
        assert.deepEqual(topic, { host: 'localhost', port: 9999, path: '/', method: 'POST', headers: headers })
      }
    }
    // Test passing string URI for options
  , 'with a string URI for options' : {
      topic: function () {
        var client = new Client('http://localhost:9999', false)
        return client.options
      }
    , 'parses the string URI into URI fields' : function (topic) {
        assert.strictEqual(topic.host, 'localhost')
        assert.strictEqual(topic.path, '/')
        assert.equal(topic.port, 9999)
      }
    }
    // Test passing custom headers to the Client
  , 'with options containing header params' : {
      topic: function () {
        var client = new Client({ host: 'localhost', port: 9999, path: '/', headers: { 'User-Agent': 'Testaroo', 'Authorization': 'Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==' }}, false)
        return client.options
      }
    , 'does not overwrite the custom headers' : function (topic) {
        var headers = {
          'User-Agent': 'Testaroo'
        , 'Authorization': 'Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ=='
        , 'Content-Type': 'text/xml'
        , 'Accept': 'text/xml'
        , 'Accept-Charset' : 'UTF8'
        , 'Connection': 'Keep-Alive'
        }
        assert.deepEqual(topic, { host: 'localhost', port: 9999, path: '/', method: 'POST', headers: headers })
      }
    }
    // Test passing HTTP Basic authentication credentials
  , 'with basic auth passed' : {
      topic: function () {
        var client = new Client({ basic_auth: { user: 'john', pass: '12345' } }, false)
        return client.options.headers
      }
    , 'correctly encodes and sets the \'Authorization\' header' : function (topic) {
        assert.isNotNull(topic.Authorization)
        assert.equal(topic.Authorization, "Basic am9objoxMjM0NQ==")
      }
    }
  }
  //////////////////////////////////////////////////////////////////////
  // Test method call functionality
  //////////////////////////////////////////////////////////////////////
, 'A method call' : {
    // Test invalid internal URI to send method call to
    'with an invalid internal URI' : {
      topic: function () {
        var client = new Client({ host: 'localhost', port: 9999, path: '/'}, false)
        client.methodCall('getArray', null, this.callback)
      }
    , 'contains the error' : function (error, value) {
        assert.isObject(error)
      }
    }
  , 'with a string URI for options' : {
      topic: function () {
        var that = this
        // Basic http server that sends a chunked XML response
        http.createServer(function (request, response) {
            response.writeHead(200, {'Content-Type': 'text/xml'})
            var data = '<?xml version="2.0" encoding="UTF-8"?>'
              + '<methodResponse>'
              + '<params>'
              + '<param><value><string>more.listMethods</string></value></param>'
              + '</params>'
              + '</methodResponse>'
            response.write(data)
            response.end()
        }).listen(9090, 'localhost')
        // Waits briefly to give the server time to start up and start listening
        setTimeout(function () {
          var client = new Client('http://localhost:9090', false)
          client.methodCall('listMethods', null, that.callback)
        }, 500)
      }
    , 'contains the string' : function (error, value) {
        assert.isNull(error)
        assert.deepEqual(value, 'more.listMethods')
      }
    }
  , 'with no host specified' : {
      topic: function () {
        var that = this
        // Basic http server that sends a chunked XML response
        http.createServer(function (request, response) {
            response.writeHead(200, {'Content-Type': 'text/xml'})
            var data = '<?xml version="2.0" encoding="UTF-8"?>'
              + '<methodResponse>'
              + '<params>'
              + '<param><value><string>system.listMethods</string></value></param>'
              + '</params>'
              + '</methodResponse>'
            response.write(data)
            response.end()
        }).listen(9091, 'localhost')
        // Waits briefly to give the server time to start up and start listening
        setTimeout(function () {
          var client = new Client({ port: 9091, path: '/'}, false)
          client.methodCall('listMethods', null, that.callback)
        }, 500)
      }
    , 'contains the string' : function (error, value) {
        assert.isNull(error)
        assert.deepEqual(value, 'system.listMethods')
      }
    }
  , 'with a chunked response' : {
      topic: function () {
        var that = this
        // Basic http server that sends a chunked XML response
        http.createServer(function (request, response) {
          response.writeHead(200, {'Content-Type': 'text/xml'})
          var chunk1 = '<?xml version="2.0" encoding="UTF-8"?>'
            + '<methodResponse>'
            + '<params>'
            + '<param><value><array><data>'
            + '<value><string>system.listMethods</string></value>'
            + '<value><string>system.methodSignature</string></value>'
          var chunk2 = '<value><string>xmlrpc_dialect</string></value>'
            + '</data></array></value></param>'
            + '</params>'
            + '</methodResponse>'
          response.write(chunk1)
          response.write(chunk2)
          response.end()
        }).listen(9092, 'localhost')
        // Waits briefly to give the server time to start up and start listening
        setTimeout(function () {
          var client = new Client({ host: 'localhost', port: 9092, path: '/'}, false)
          client.methodCall('listMethods', null, that.callback)
        }, 500)
      }
    , 'contains the array' : function (error, value) {
        assert.isNull(error)
        assert.deepEqual(value, ['system.listMethods', 'system.methodSignature', 'xmlrpc_dialect'])
      }
    }
  , 'with a utf-8 encoding' : {
      topic: function () {
        var that = this
        http.createServer(function (request, response) {
            response.writeHead(200, {'Content-Type': 'text/xml'})
            var data = '<?xml version="2.0" encoding="UTF-8"?>'
              + '<methodResponse>'
              + '<params>'
              + '<param><value><string>here is mr. Snowman: ☃</string></value></param>'
              + '</params>'
              + '</methodResponse>'
            response.write(data)
            response.end()
        }).listen(9093, 'localhost')
        // Waits briefly to give the server time to start up and start listening
        setTimeout(function () {
          var client = new Client('http://localhost:9093', false)
          client.methodCall('listMethods', null, that.callback)
        }, 500)
      }
    , 'contains the correct string' : function (error, value) {
        assert.isNull(error)
        assert.deepEqual(value, 'here is mr. Snowman: ☃')
      }
    }
    // , 'with a ISO-8859-1 encoding' : {
    //     topic: function () {
    //       var that = this
    //       http.createServer(function (request, response) {
    //           response.writeHead(200, {'Content-Type': 'text/xml'})
    //           var data = '<?xml version="1.0" encoding="ISO-8859-1"?>'
    //             + '<methodResponse>'
    //             + '<params>'
    //             + '<param><value><string>äè12</string></value></param>'
    //             + '</params>'
    //             + '</methodResponse>'
    //           var iconv = new Iconv('utf-8','iso-8859-1')
    //           data = iconv.convert(data)
    //           response.write(data)
    //           response.end()
    //       }).listen(9094, 'localhost')
    //       // Waits briefly to give the server time to start up and start listening
    //       setTimeout(function () {
    //         var client = new Client({ host: 'localhost', port: 9094, path: '/', responseEncoding : 'binary'}, false)
    //         client.methodCall('listMethods', null, that.callback)
    //       }, 500)
    //     }
    //   , 'contains the correct string' : function (error, value) {
    //       assert.isNull(error)
    //       assert.deepEqual(value, 'äè12')
    //     }
    //   }
  }
}).export(module)
