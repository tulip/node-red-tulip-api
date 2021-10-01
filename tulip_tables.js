module.exports = function (RED) {
  'use strict';

  const request = require('request');
  const http = require('http');
  const https = require('https');
  const httpLibs = {
    http,
    https,
  }
  const tulipTables = require('./static/tulip_tables_common');

  // Tulip API node
  function TablesNode(config) {
    RED.nodes.createNode(this, config);

    // Set node properties
    this.name = config.name;
    this.apiAuth = RED.nodes.getNode(config.apiAuth);
    this.agent = new httpLibs[apiAuth.protocol].Agent({
      keepAlive: config.keepAlive,
      keepAliveMsecs: config.keepAliveMsecs,
    });
    this.config = config;
    const node = this;

    const queryInfo = tulipTables.TABLE_QUERY_TYPES[config.queryType];
    const hasBody = queryInfo.method == 'POST' || queryInfo.method == 'PUT';

    // Handle node inputs
    node.on('input', function (msg, send, done) {
      // Get all relevant parameters, overriding config value with msg if set
      const pathParams = {};
      const queryParams = {};

      for (const p of queryInfo.pathParams) {
        pathParams[p] = getParamVal(p, msg);
      }
      for (const p of queryInfo.queryParams) {
        queryParams[p] = getParamVal(p, msg);
      }

      // Create URL
      const reqUrl = getApiUrl(
        node.apiAuth.protocol,
        node.apiAuth.hostname,
        node.apiAuth.port,
        pathParams,
        queryParams,
      );

      // Configure request with auth
      const options = {
        url: reqUrl,
        method: queryInfo.method,
        auth: {
          user: node.apiAuth.credentials.apiKey,
          pass: node.apiAuth.credentials.apiSecret,
        },
        agent: node.agent,
      };

      // If a POST request, add the request body
      if (hasBody) {
        options.body = JSON.stringify(getParamVal('body', msg));
        options.headers = getHeaders(msg);
      } else {
        options.headers = msg.headers;
      }

      // Make the request
      request(options, function (err, res, body) {
        if (err) {
          done(err);
        } else {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            // Request returns error code
            node.error(new Error(`Response status code ${res.statusCode}:` + `${res.body}`));
          }

          // Request went through, forward response as node output
          const resBody = res.body == '' ? res.body : JSON.parse(res.body);
          const msg = {
            response: res,
            payload: resBody,
          };
          send(msg);
          done();
        }
      });
    });

    function getApiUrl(protocol, hostname, port, pathParams, queryParams) {
      // start with valid protocol & host
      const baseUrl = `${protocol}://${hostname}`;
      const url = new URL(baseUrl);

      // build the url
      url.port = port;
      url.pathname = '/api/v3' + queryInfo.pathConstructor(pathParams);
      for (const queryParam in queryParams) {
        const queryParamVal = queryParams[queryParam];
        if (queryParamVal != undefined) {
          url.searchParams.set(queryParam, queryParamVal);
        }
      }

      return url;
    }

    function getParamVal(p, msg) {
      const msgVal = msg[p];
      const configVal = node.config[p];

      // Take parameter from msg
      if (msgVal != undefined) {
        if (Array.isArray(msgVal)) {
          // encode array as string
          return JSON.stringify(msgVal);
        } else {
          return msgVal;
        }
        // Take parameter from config
      } else if (configVal != undefined && configVal != null) {
        if (p == 'sortBy' && configVal == 'other') {
          // sortBy is special case, if 'other' get the value
          return node.config['sortByFieldId'];
        } else if (Array.isArray(configVal)) {
          // encode array as string
          return JSON.stringify(configVal);
        } else if (p == 'body') {
          // Convert JSON string to object
          return JSON.parse(configVal);
        } else {
          return configVal;
        }
      } else {
        return undefined;
      }
    }

    /**
     * Gets the headers for the Tulip API request. Uses the user-defined msg.headers,
     * but overrides 'Content-Type' to 'application/json'.
     */
    function getHeaders(msg) {
      // Default header for API request
      const headers = msg.headers || {};

      // Content-Type set by this node; overrides user value
      if (headers['Content-Type']) {
        node.warn(
          `Overriding header 'Content-Type'='${headers['Content-Type']}'; must be 'application/json'`,
        );
      }
      headers['Content-Type'] = 'application/json';
      return headers;
    }
  }

  // Register the node
  RED.nodes.registerType('tulip-tables', TablesNode);

  RED.httpAdmin.get('/node-red-tulip-edge/js/*', function (req, res) {
    const options = {
      root: __dirname + '/static/',
      dotfiles: 'deny',
    };

    res.sendFile(req.params[0], options);
  });
};
