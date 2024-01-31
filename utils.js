'use strict';

const https = require('https');
const http = require('http');
const HttpsProxyAgent = require('https-proxy-agent');
const url = require('url');

/**
 * Makes an HTTP request to the designated endpoint with options. Passes on the HTTP response
 * in an outgoing message.
 * @param {Object} httpLib - http or https library, depending on which protocol to use
 * @param {URL} endpoint - URL to send the request to
 * @param {Object} options - options for the http(s) request
 * @param {string} [body] - stringified JSON body
 * @param {function} error - function to log errors
 * @param {function} send - function to pass the outgoing message to.
 * @param {function} done - function to call after the message has been sent
 */
const doHttpRequest = function (
  httpLib,
  endpoint,
  options,
  body,
  error,
  send,
  done
) {
  const req = httpLib.request(endpoint, options, (res) => {
    if (res.statusCode < 200 || res.statusCode >= 300) {
      // Request returns error code
      error(new Error(`Response status code ${res.statusCode}`));
    }

    let respBody = '';
    res.on('data', (chunk) => {
      respBody += chunk;
    });

    // At the end of response, pass response body as msg.payload
    res.on('end', () => {
      try {
        const convertJSON =
          res.headers['content-type'] &&
          res.headers['content-type'].includes('application/json');

        // if response is JSON, parse body as JSON
        const payload = convertJSON ? JSON.parse(respBody) : respBody;
        const msg = {
          response: res,
          payload,
        };

        send(msg);
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  req.on('error', (err) => {
    done(err);
  });

  if (body) {
    req.write(body);
  }

  req.end();
};

/**
 * Add the Machine API endpoint path to a Tulip factory url
 * @param {URL} url - the base factory url
 * @returns {URL} url with added path for Machine API endpoint
 */
function getMachineAttributeEndpoint(url) {
  const urlCopy = new URL(url);
  urlCopy.pathname = '/api/v3/attributes/report';
  return urlCopy;
}

/**
 * @param {string} protocol - either https or http
 * @returns library for sending http(s) requests
 */
const getHttpLib = function (protocol) {
  const httpLibs = {
    http,
    https,
  };
  const httpLib = httpLibs[protocol];
  if (!httpLib) {
    throw new Error(`Expected protocol of http or https, got: ${protocol}`);
  }
  return httpLib;
};

/**
 * Returns the agent for http(s) requests.
 *
 * Respects the http_proxy environment variable. If no proxy, then returns an agent for the
 * specified protocol with given keep-alive options. If present, then returns an HttpProxyAgent
 * for the proxy specified by http_proxy. If there is an issue with the http_proxy url,
 * then defaults back to the normal agent with no proxy & logs an error.
 *
 * @param {Object} httpLib either http or https library
 * @param {boolean} keepAlive whether to keep sockets around even when there are no
    outstanding requests, so they can be used for future requests without
    having to reestablish a TCP connection.
 * @param {number} keepAliveMsecs initial delay (in milliseconds) for TCP keep-alive packets
 */
const getHttpAgent = function (httpLib, keepAlive, keepAliveMsecs) {
  // honor any http proxy settings passed from env
  const proxyUrl = process.env['http_proxy'];

  if (proxyUrl) {
    // TODO: Switch to hpagent, which is what the newer Node-RED HTTP nodes use.
    // https-proxy-agent doesn't support keep alive settings, so ignore them.
    try {
      const options = url.parse(proxyUrl);
      const agent = HttpsProxyAgent(options);
      return agent;
    } catch (err) {
      console.error(
        `could not create HttpsProxyAgent from env http_proxy=${proxyUrl}`
      );
    }
  }

  // No proxy, use keep alive options
  return new httpLib.Agent({
    keepAlive: keepAlive,
    keepAliveMsecs: keepAliveMsecs,
  });
};

module.exports = {
  doHttpRequest,
  getHttpAgent,
  getHttpLib,
  getMachineAttributeEndpoint,
};
