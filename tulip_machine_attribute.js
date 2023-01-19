module.exports = function (RED) {
  'use strict';

  const {
    doHttpRequest,
    getHttpAgent,
    getHttpLib,
    getMachineAttributeEndpoint,
  } = require('./utils');

  /**
   * Validates a list of attributes to write to the Machine API. Is valid if it is a list of
   * { attributeId: string, machineId: string, value: any }
   * @param {Object[]} payload - list of { machineId, attributeId, value } to validate
   * @returns {Object} result - the validation result
   * @returns {boolean} result.isValid - whether the input list is valid
   * @returns {string|null} result.errorMessage - error message if not valid, otherwise null
   */
  const validateBatchedPayload = function (payload) {
    try {
      // Wrap in try-catch in case there is an unexpected validation error
      if (!Array.isArray(payload)) {
        return {
          isValid: false,
          errorMessage: `invalid payload: expected array, got: ${typeof payload}`,
        };
      } else {
        for (const attribute of payload) {
          const attributeId = attribute.attributeId;
          const machineId = attribute.machineId;
          const value = attribute.value;

          // validate attributeId exists and is string
          if (typeof attributeId !== 'string') {
            return {
              isValid: false,
              errorMessage:
                `attributeId must be a string, got: ` +
                `<${attributeId}> of type <${typeof attributeId}>`,
            };
          }
          // validate machineId exists and is string
          if (typeof machineId !== 'string') {
            return {
              isValid: false,
              errorMessage: `machineId must be a string, got: ${machineId}`,
            };
          }
          // validate value is not null|undefined
          if (value === undefined || value === null) {
            return {
              isValid: false,
              errorMessage: `value cannot be null or undefined, got: ${value}`,
            };
          }
        }
      }
    } catch (err) {
      return {
        isValid: false,
        errorMessage: `invalid payload: ${JSON.stringify(err, null, 2)}`,
      };
    }

    return {
      isValid: true,
      errorMessage: null,
    };
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

    // Legacy nodes only allowed writing one attribute, so if property is missing default to true
    this.singleAttribute = 'singleAttribute' in config ? config.singleAttribute : true;

    // Legacy nodes did not allow retaining msg props, so if property is missing default to false
    this.retainMsgProps = 'retainMsgProps' in config ? config.retainMsgProps : false;

    this.apiCredentials = apiAuthNode.credentials;
    const factoryUrl = getFactoryUrl(
      apiAuthNode.protocol,
      apiAuthNode.hostname,
      apiAuthNode.port,
    );
    this.endpoint = getMachineAttributeEndpoint(factoryUrl);
    this.httpLib = getHttpLib(apiAuthNode.protocol);

    const node = this;

    // Use http or https depending on the factory protocol
    const agent = getHttpAgent(node.httpLib, config.keepAlive, config.keepAliveMsecs);

    // Configure HTTP POST request options w/auth
    const defaultRequestOpts = {
      method: 'POST',
      auth: `${node.apiCredentials.apiKey}:${node.apiCredentials.apiSecret}`,
      agent,
    };


    // Handle node inputs
    this.on('input', function (msg, send, done) {
      try {
        const headers = getHeaders(msg, node);

        // Decide whether to pass the input msg params to the output msg
        const sendMsg = node.retainMsgProps
          ? (newMsg) => {
              send({
                ...msg,
                ...newMsg,
              });
            }
          : send;

        if (node.singleAttribute) {
          // Get the payload from user-defined input
          const payload = getPayloadFromSource(msg, node);

          // Use either config or override with msg value
          const machineId = getDeviceInfo(msg, node.deviceInfo, 'machineId');
          const attributeId = getDeviceInfo(msg, node.deviceInfo, 'attributeId');

          // Everything is ok, send the payload
          sendPayloadForAttribute(payload, headers, machineId, attributeId, sendMsg, done);
        } else {
          const { isValid, errorMessage } = validateBatchedPayload(msg.payload);
          if (!isValid) {
            done(new Error(errorMessage));
            return;
          }

          sendPayloadAsAttributes(msg.payload, headers, sendMsg, done);
        }
      } catch (e) {
        done(e);
      }
    });

    // Sends payload to Tulip Machine API for attribute given by { machineId, attributeId }
    function sendPayloadForAttribute(payload, headers, machineId, attributeId, send, done) {
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

      const options = defaultRequestOpts;
      options.headers = headers;

      // Create, send, handle, and close HTTP request
      doHttpRequest(node.httpLib, node.endpoint, options, body, node.error.bind(node), send, done);
    }

    // Sends payload to Tulip Machine API as the request `attributes` property
    function sendPayloadAsAttributes(payload, headers, send, done) {
      const bodyObj = {
        attributes: payload,
      };
      const body = JSON.stringify(bodyObj);

      const options = defaultRequestOpts;
      options.headers = headers;

      // Create, send, handle, and close HTTP request
      doHttpRequest(node.httpLib, node.endpoint, options, body, node.error.bind(node), send, done);
    }

    function getFactoryUrl(protocol, hostname, port) {
      // start with valid protocol & host
      const baseUrl = `${protocol}://${hostname}`;
      const url = new URL(baseUrl);

      // build the url
      url.port = port;
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
  function getPayloadFromSource(msg, node) {
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
