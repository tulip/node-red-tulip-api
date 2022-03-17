module.exports = function (RED) {
  'use strict';

  const http = require('http');
  const https = require('https');
  const httpLibs = {
    http,
    https,
  };
  const tulipTables = require('./static/tulip_tables_common');

  // Tulip API node
  function TablesNode(config) {
    RED.nodes.createNode(this, config);

    // Set node properties
    this.name = config.name;
    this.apiAuth = RED.nodes.getNode(config.apiAuth);
    this.config = config;

    // Use http or https depending on the factory protocol
    const httpLib = httpLibs[this.apiAuth.protocol];
    this.agent = new httpLib.Agent({
      keepAlive: config.keepAlive,
      keepAliveMsecs: config.keepAliveMsecs,
    });
    const node = this;

    const queryInfo = tulipTables.TABLE_QUERY_TYPES[config.queryType];
    const hasBody = queryInfo.method == 'POST' || queryInfo.method == 'PUT';

    // Handle node inputs
    node.on('input', function (msg, send, done) {
      try {
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
          queryParams
        );

        // Configure request with auth
        const options = {
          method: queryInfo.method,
          auth: `${node.apiAuth.credentials.apiKey}:${node.apiAuth.credentials.apiSecret}`,
          agent: node.agent,
        };

        // Make the http(s) request
        const req = httpLib.request(reqUrl, options, handler(send, done));
        setHeaders(req, msg.headers);

        if (hasBody) {
          // Send the message body
          const rawBody = getParamVal('body', msg);
          const body = JSON.stringify(rawBody);
          req.write(body);
        }

        req.on('error', (err) => {
          done(err);
        });

        req.end();
      } catch (err) {
        // Catch unhandled errors so node-red doesn't crash
        done(err);
      }
    });

    // Returns a handler for the HTTP response that passes the body to `send`, and passes
    // errors to onError
    const handler = function (send, done) {
      return (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          // Request returns error code
          node.error(new Error(`Response status code ${res.statusCode}`));
        }

        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });

        // At the end of response, pass response body as msg.payload
        res.on('end', () => {
          const convertJSON =
            res.headers['content-type'] &&
            res.headers['content-type'].includes('application/json');

          // if response is JSON, parse body as JSON
          const payload = convertJSON ? JSON.parse(body) : body;
          const msg = {
            response: res,
            payload,
          };
          send(msg);
          done();
        });
      };
    };

    const setHeaders = function (req, headers) {
      if (headers) {
        Object.entries(headers).forEach(([header, val]) => {
          req.setHeader(header, val);
        });
      }

      if (hasBody) {
        // Set content-type to some form of application/json if not already
        const oldContentType = req.getHeader('content-type');
        if (oldContentType && !oldContentType.includes('application/json')) {
          node.warn(
            `Overriding header 'content-type'='${oldContentType}'; must be 'application/json'`
          );
          req.setHeader('content-type', 'application/json');
        } else if (!oldContentType) {
          req.setHeader('content-type', 'application/json');
        }
      }
    };

    const getApiUrl = function (
      protocol,
      hostname,
      port,
      pathParams,
      queryParams
    ) {
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
    };

    const getParamVal = function (p, msg) {
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
    };
  }

  // Register the node
  RED.nodes.registerType('tulip-tables', TablesNode);

  // Host files in /static/ at /node-red-tulip-edge/js/ so they are accessible by browser code
  RED.httpAdmin.get('/node-red-tulip-edge/js/*', function (req, res) {
    const options = {
      root: __dirname + '/static/',
      dotfiles: 'deny',
    };

    res.sendFile(req.params[0], options);
  });
};
