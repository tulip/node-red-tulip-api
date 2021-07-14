# Node-RED Tulip API Nodes

This package includes several Node-RED nodes to support sending data to the Tulip API. The included nodes are:
- `tulip-machine-attribute`: sends data to Tulip machine attribute endpoints
- `tulip-tables`: sends data and reads data from Tulip tables
- `tulip-api-auth`: a configuration node that authenticates Tulip API requests using Tulip API bot credentials

**Note:** To use the Tulip API, you must be a registered Tulip user with a factory instance. In this README, we will use the Tulip account url `your-factory-instance.tulip.co` to refer to your account.

## Installation

You can install this node either through `npm` or the Node-RED palette.

### To install with `npm`:

Navigate to your Node-RED user directory, for example `~/.node-red/`, and run the following command:

```
npm install @tulip/node-red-tulip-api
```

### To install via the Node-RED palette:

Open the Node-RED Editor, navigate to the menu (upper right-hand corner), click **Manage palette** > **Install**, and search for `node-red-tulip-api`. Click **install**.

If there is an issue with installation, please create an issue with details.

## Tulip Machine Attribute Node

### Prerequisites
Before using a `tulip-machine-attribute` node, make sure that you have completed the following steps:

1. Have machine monitoring enabled on your factory instance. This is required to use the Machine Attributes API.

2. Follow the steps in [this support article](https://support.tulip.co/en/articles/5007794-how-to-use-the-machine-attributes-api) to:

  - Configure an API Bot with `attributes:write` permissions
  - Create a machine that uses the Tulip API as a datasource
  - Define machine attributes for the machine


### Node Configuration

- **Name**: Display name for the node instance in the editor
- **Tulip Api Authentication**: A configuration node with authentication details for an API bot on your Tulip account. The API bot must have `attributes:write` permissions. See more details in the [Tulip API Auth Node](#tulip-api-auth-node) section.
- **Device Info**: Defines which machine attribute endpoint this node will send data to. You can copy-paste this field from the target machine attribute on your factory instance by following these steps:
  - Navigate to `your-factory-instance.tulip.co`
  - Click on **Shop Floor** > **Machines**
  - Click on the target machine
  - Copy-paste the JSON field with `attributeId` and `machineId` properties for the target machine attribute
- **Attribute Source**: What source to use for the attribute value. For example, if set to `msg.payload`, the attribute will be sent the value of `msg.payload`; if set to a hardcoded string, the attribute will be sent the hardcoded string, etc. Supported sources are:
 - properties of `msg`, `flows`, or `global`
 - strings
 - numbers
 - JSONata expressions
 - environment variables

### Inputs

- `msg.payload`: The value of the attribute to send. Should match the type of the machine attribute endpoint. A different input property than `payload` can be set as the attribute value by setting the `Attribute Source` property.
- `msg.machineId` (optional):  Value to override the `machineId` set in "Device Info".
- `msg.attributeId` (optional): Value to override the `attrbiuteId` set in "Device Info"


### Outputs

- `msg.response`: The HTTP response from the API request.


## Tulip Tables Node

### Overview

The Tulip Tables API node supports sending data to and reading data from Tulip Tables, as well as reading Tulip Table metadata, using the Tulip Tables API.

Each `tulip-tables` node is configured to send data to a single Tulip Tables API endpoint. On an input message, the node will send the configured request and output the HTTP response along with any returned data. The **Query Type** field determines the type of request, relevant parameters, and the response data type. See the Tulip Tables API documentation at `your-factory-instance.tulip.co/apiDocs` for more information on the different types of requests.

### Node Configuration

- **Name**: Display name for the node instance in the editor
- **Tulip Api Authentication**: A configuration node with authentication details for an API bot on your Tulip account. The API bot must have `tables:read` and `tables:write` permissions for read and write operations respectively. See more details in the [Tulip API Auth Node](#tulip-api-auth-node) section.
- **Query Type**: This field determines which endpoint to send the request to. All other configuration is dependent on the query type, TODO

### Inputs

- `msg.body`: If the query type is a POST or PUT request, the body of the request. Overrides any data in the "Request Body" field.
- `msg.[parameter]`: Any parameter of a Tulip Tables API request can be set by the input `msg.[parameter]`. The message value overrides the parameter value set by the node configuration. For example, `msg.tableId` will override "Table ID". The parameter name must match the parameter name listed in the API documentation.

### Outputs

- `msg.response`: The HTTP response from the API request.
- `msg.payload`: The parsed response body


## Tulip API Auth Node

Each `tulip-api-auth` node configures authentication for using the Tulip API. The API credentials should be for a bot on the specified factory instance that has the correct permissions to make the specified API calls.

Requests will be sent to: `${protocol}://{factory-url}:{port}/{endpoint}`

Each authentication node can be shared between multiple Tulip API nodes.

### Node Configuration

- **Name**: Display name for the node instance in the editor.
- **Protocol**: Which protocol to use for API calls (`http` or `https`). Defaults to `https`.
- **Factory URL**: For example, `your-factory-instance.tulip.co`
- **Port** (optional): Custom port to use for API calls. Defaults to `80` for `http` and `443` for `https`.
- **API Key**: The API key for the API bot. Should start with `apikey.2_`.
- **API Secret**: The API secret for the API bot.
