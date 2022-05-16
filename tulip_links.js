const {doHttpRequest, getHeaders} = require("./utils");
module.exports = function (RED) {
    'use strict';

    const http = require('http');
    const https = require('https');
    const httpLibs = {
        http,
        https,
    };

    const {doHttpRequest} = require('./utils');

    // Tulip API node
    function LinksNode(config) {
        RED.nodes.createNode(this, config);

        var node = this;
        this.apiAuth = RED.nodes.getNode(config.apiAuth);


        // Use http or https depending on the factory protocol
        const httpLib = httpLibs[node.apiAuth.protocol];
        this.agent = new httpLib.Agent({});

        node.on('input', function (msg, send, done) {
            console.log("wake up")
            const linkId = msg.linkId || config.linkId;

            const auth = node.apiAuth;
            const url = new URL(`${auth.protocol}://${auth.hostname}`);
            url.port = auth.port;

            switch(config.queryType) {
                case "info":
                    url.pathname = `/api/v3/tableLinks/${linkId}`
                    doHttpRequest(
                        httpLib,
                        url,
                        {
                            method: "GET",
                            auth: `${node.apiAuth.credentials.apiKey}:${node.apiAuth.credentials.apiSecret}`,
                            agent: node.agent,
                        },
                        null,
                        node.error.bind(node),
                        (response) => {
                            response.request = {
                                linkId: linkId
                            };
                            send(response);
                        },
                        done
                    );
                    break;
            }
        });
    }

    // Register the node
    RED.nodes.registerType('tulip-links', LinksNode);
};
