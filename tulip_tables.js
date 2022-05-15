module.exports = function (RED) {
  'use strict';

  const http = require('http');
  const https = require('https');
  const httpLibs = {
    http,
    https,
  };
  const tulipTables = require('./static/tulip_tables_common');
  const { doHttpRequest } = require('./utils');

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
          headers: getHeaders(hasBody, msg.headers),
        };

        let body;
        if (hasBody) {
          // Send the message body
          const rawBody = getParamVal('body', msg);
          body = JSON.stringify(rawBody);
        }

        // Create, send, handle, and close HTTP request
        doHttpRequest(
          httpLib,
          reqUrl,
          options,
          body,
            node.error.bind(node),
            (resultMsg) => {
              if (node.config.includeRequestInResult) {
                resultMsg.request = {
                  pathParams: pathParams,
                  queryParams: queryParams,
                  body: getParamVal('body', msg),
                  payload: msg.payload
                };
              }
              node.send(resultMsg);
          },
          done
        );
      } catch (err) {
        // Catch unhandled errors so node-red doesn't crash
        done(err);
      }
    });

    // Returns the headers object; if a request with a body sets the
    // content-type to application/json
    const getHeaders = function (hasBody, headers) {
      if (!headers) {
        // Initialize headers object if none exist
        headers = {};
      }
      if (hasBody) {
        // Set content-type to some form of application/json if not already
        const oldContentType = headers['content-type'];
        if (oldContentType && !oldContentType.includes('application/json')) {
          node.warn(
            `Overriding header 'content-type'='${oldContentType}'; must be 'application/json'`
          );
          headers['content-type'] = 'application/json';
        } else if (!oldContentType) {
          headers['content-type'] = 'application/json';
        }
      }
      return headers;
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
