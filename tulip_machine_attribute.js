module.exports = function (RED) {
  'use strict';

  const https = require('https');
  const http = require('http');
  const httpLibs = {
    http,
    https,
  };

  // Tulip API node
  function MachineAttrNode(config) {
    RED.nodes.createNode(this, config);
    const apiAuthNode = RED.nodes.getNode(config.apiAuth);

    // Set node properties
    this.name = config.name;
    this.deviceInfo = JSON.parse(config.deviceInfo);
    this.payloadSource = config.payloadSource;
    this.payloadType = config.payloadType;
    this.apiCredentials = apiAuthNode.credentials;
    this.factoryUrl = getFactoryUrl(
      apiAuthNode.protocol,
      apiAuthNode.hostname,
      apiAuthNode.port
    );
    this.protocol = apiAuthNode.protocol;

    // Use http or https depending on the factory protocol
    const httpLib = httpLibs[this.protocol];
    this.agent = new httpLib.Agent({
      keepAlive: config.keepAlive,
      keepAliveMsecs: config.keepAliveMsecs,
    });

    const node = this;

    // Handle node inputs
    this.on('input', function (msg, send, done) {
      try {
        // Get the payload from user-defined input
        const payload = getPayload(msg, node);
        const headers = getHeaders(msg, node);

        // Use either config or override with msg value
        const machineId = getDeviceInfo(msg, node.deviceInfo, 'machineId');
        const attributeId = getDeviceInfo(msg, node.deviceInfo, 'attributeId');

        // Everything is ok, send the payload
        sendPayload(payload, headers, machineId, attributeId, send, done);
      } catch (e) {
        done(e);
      }
    });

    // Sends payload to Tulip Machine API
    function sendPayload(payload, headers, machineId, attributeId, send, done) {
      const bodyObj = {
        attributes: [
          {
            machineId,
            attributeId,
            value: payload,
          },
        ],
      };
      const body = JSON.stringify(bodyObj);

      // Get machine attribute endpoint for the configured factory instance
      const endpoint = getMachineAttributeEndpoint(node.factoryUrl);

      // Configure POST request w/auth
      const options = {
        method: 'POST',
        auth: `${node.apiCredentials.apiKey}:${node.apiCredentials.apiSecret}`,
        agent: node.agent,
      };

      // Make the http(s) request
      const req = httpLib.request(endpoint, options, handler(send, done));
      setHeaders(req, headers);

      req.write(body);
      req.on('error', (err) => {
        done(err);
      });

      req.end();
    }

    const setHeaders = function (req, headers) {
      if (headers) {
        Object.entries(headers).forEach(([header, val]) => {
          req.setHeader(header, val);
        });
      }
    };

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

    function getFactoryUrl(protocol, hostname, port) {
      // start with valid protocol & host
      const baseUrl = `${protocol}://${hostname}`;
      const url = new URL(baseUrl);

      // build the url
      url.port = port;
      return url;
    }

    function getMachineAttributeEndpoint(url) {
      url.pathname = '/api/v3/attributes/report';
      return url;
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
          `Overriding header 'Content-Type'='${headers['Content-Type']}'; must be 'application/json'`
        );
      }
      headers['Content-Type'] = 'application/json';
      return headers;
    }

    /**
     * If the machineId or attributeId is present in the msg, returns the value.
     * Otherwise, returns the value from the statically configured Device Info field.
     */
    function getDeviceInfo(msg, deviceInfo, param) {
      const paramVal = msg[param];
      const configVal = deviceInfo[param];
      if (paramVal == undefined) {
        // Use config value
        return configVal;
      } else {
        // Use msg value
        if (typeof paramVal != 'string') {
          // msg parameter is invalid
          const paramType = typeof paramVal;
          throw new Error(
            `msg.${param} must be string,` +
              `${paramVal} is of type ${paramType}`
          );
        } else {
          // msg has valid parameter
          return paramVal;
        }
      }
    }
  }

  /**
   * Gets the payload from the configured payload source.
   * Throws an error if the payload is undefined.
   */
  function getPayload(msg, node) {
    const payload = getTypedData(
      msg,
      node,
      node.payloadType,
      node.payloadSource
    );
    if (payload == undefined) {
      throw new Error('payload not defined');
    }
    return payload;
  }

  /*
   * Gets the data from a TypedInput configuration field. If JSONata, evaluates the expression,
   * otherwise evaluates the node property. Throws an error if the JSONata is invalid or if
   * the specified property does not exist.
   */
  function getTypedData(msg, node, dataType, dataVal) {
    if (dataType === 'jsonata') {
      // Evaluate JSONata expression
      try {
        const expr = RED.util.prepareJSONataExpression(dataVal, node);
        return RED.util.evaluateJSONataExpression(expr, msg);
      } catch (err) {
        // Add detailed error message
        node.error(`Error evaluating JSONata expression: ${dataVal}`);
        throw err;
      }
    } else {
      // Evaluate node property
      try {
        return RED.util.evaluateNodeProperty(dataVal, dataType, node, msg);
      } catch (err) {
        // Add detailed error message
        node.error(
          new Error(
            `Error evaluating node property ${dataVal} of type ${dataType}`
          )
        );
        throw err;
      }
    }
  }

  // Register the node type
  RED.nodes.registerType('tulip-machine-attribute', MachineAttrNode);
};
