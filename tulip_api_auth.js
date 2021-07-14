module.exports = function (RED) {
  'use strict';

  // Tulip API auth node
  function TulipApiAuthNode(config) {
    RED.nodes.createNode(this, config);
    this.name = config.name;
    this.protocol = config.protocol;
    this.hostname = config.hostname;
    this.port = config.port;
  }

  RED.nodes.registerType('tulip-api-auth', TulipApiAuthNode, {
    credentials: {
      apiKey: { type: 'text' },
      apiSecret: { type: 'password' },
    },
  });
};
