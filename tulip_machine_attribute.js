module.exports = function (RED) {
  'use strict';

  const request = require('request');
  const https = require('https');
  const http = require('http');
  const httpLibs = {
      http,
      https
  }
  const { v4: uuidv4 } = require('uuid');

  // Tulip API node
  function MachineAttrNode(config) {
    RED.nodes.createNode(this, config);
    const apiAuthNode = RED.nodes.getNode(config.apiAuth);

    // Set node properties
    this.name = config.name;
    this.deviceInfo = JSON.parse(config.deviceInfo);
    this.payloadSource = config.payloadSource;
    this.payloadType = config.payloadType;
    this.agent = new httpLibs[apiAuthNode.protocol].Agent({
      keepAlive: config.keepAlive,
      keepAliveMsecs: config.keepAliveMsecs,
    });

    // Properties that depend on auth configuration
    this.apiCredentials = apiAuthNode.credentials;
    this.factoryUrl = getFactoryUrl(apiAuthNode.protocol, apiAuthNode.hostname, apiAuthNode.port);

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
        url: endpoint,
        body,
        method: 'POST',
        headers,
        auth: {
          user: node.apiCredentials.apiKey,
          pass: node.apiCredentials.apiSecret,
        },
        agent: node.agent,
      };

      // Send request
      request(options, function (err, res, body) {
        if (err) {
          done(err);
        } else {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            // Request returns error code
            node.error(new Error(res.body));
          }
          // Forward response as node output
          const msg = {
            response: res,
          };
          send(msg);
          done();
        }
      });
    }

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
          `Overriding header 'Content-Type'='${headers['Content-Type']}'; must be 'application/json'`,
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
          throw new Error(`msg.${param} must be string,` + `${paramVal} is of type ${paramType}`);
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
    const payload = getTypedData(msg, node, node.payloadType, node.payloadSource);
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
        node.error(new Error(`Error evaluating node property ${dataVal} of type ${dataType}`));
        throw err;
      }
    }
  }

  // Register the node type
  RED.nodes.registerType('tulip-machine-attribute', MachineAttrNode);
};
