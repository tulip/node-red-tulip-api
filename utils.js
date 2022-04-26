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
 *
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
  });

  if (body) {
    req.write(body);
  }
  req.on('error', (err) => {
    done(err);
  });
  req.end();
};

module.exports = {
  doHttpRequest,
};
