(function(exports) {
  exports.TABLE_QUERY_TYPES = [
    {
      text: 'List tables',
      method: 'GET',
      pathParams: [],
      queryParams: ['includeDeleted'],
      pathConstructor: function(p) {
        return '/tables';
      }
    },
    {
      text: 'Create a table',
      method: 'POST',
      pathParams: [],
      queryParams: [],
      pathConstructor: function(p) {
        return '/tables';
      }
    },
    {
      text: 'Look up a table',
      method: 'GET',
      pathParams: ['tableId'],
      queryParams: [],
      pathConstructor: function(p) {
        return `/tables/${p.tableId}`;
      }
    },
    {
      text: 'Update a table',
      method: 'PUT',
      pathParams: ['tableId'],
      queryParams: [],
      pathConstructor: function(p) {
        return `/tables/${p.tableId}`;
      }
    },
    {
      text: 'List records',
      method: 'GET',
      pathParams: ['tableId'],
      queryParams: [
        'limit',
        'offset',
        'sortBy',
        'sortDir',
        'includeTotalCount',
        'filters',
        'filterAggregator',
        'sortOptions'
      ],
      pathConstructor: function(p) {
        return `/tables/${p.tableId}/records`;
      }
    },
    {
      text: 'Create a record',
      method: 'POST',
      pathParams: ['tableId'],
      queryParams: [],
      pathConstructor: function(p) {
        return `/tables/${p.tableId}/records`;
      }
    },
    {
      text: 'Delete all records',
      method: 'DELETE',
      pathParams: ['tableId'],
      queryParams: ['allowRecordsInUse'],
      pathConstructor: function(p) {
        return `/tables/${p.tableId}/records`;
      }
    },
    {
      text: 'Count records',
      method: 'GET',
      pathParams: ['tableId'],
      queryParams: [
        'filters',
        'filterAggregator'
      ],
      pathConstructor: function(p) {
        return `/tables/${p.tableId}/count`;
      }
    },
    {
      text: 'Run an aggregate function',
      method: 'GET',
      pathParams: ['tableId'],
      queryParams: [
        'fieldId',
        'function',
        'limit',
        'sortOptions',
        'filters',
        'filterAggregator'
      ],
      pathConstructor: function(p) {
        return `/tables/${p.tableId}/runAggregation`;
      }
    },
    {
      text: 'Look up a record',
      method: 'GET',
      pathParams: [
        'tableId',
        'recordId'
      ],
      queryParams: ['field'],
      pathConstructor: function(p) {
        return `/tables/${p.tableId}/records/${p.recordId}`;
      }
    },
    {
      text: 'Update a record',
      method: 'PUT',
      pathParams: [
        'tableId',
        'recordId'
      ],
      queryParams: [],
      pathConstructor: function(p) {
        return `/tables/${p.tableId}/records/${p.recordId}`;
      }
    },
    {
      text: 'Delete a record',
      method: 'DELETE',
      pathParams: [
        'tableId',
        'recordId'
      ],
      queryParams: [],
      pathConstructor: function(p) {
        return `/tables/${p.tableId}/records/${p.recordId}`;
      }
    },
    {
      text: 'List queries',
      method: 'GET',
      pathParams: ['tableId'],
      queryParams: [],
      pathConstructor: function(p) {
        return `/tables/${p.tableId}/queries`;
      }
    },
    {
      text: 'Create a query',
      method: 'POST',
      pathParams: ['tableId'],
      queryParams: [],
      pathConstructor: function(p) {
        return `/tables/${p.tableId}/queries`;
      }
    },
    {
      text: 'Look up a query',
      method: 'GET',
      pathParams: [
        'tableId',
        'queryId'
      ],
      queryParams: [],
      pathConstructor: function(p) {
        return `/tables/${p.tableId}/query/${p.queryId}`;
      }
    },
    {
      text: 'Update a query',
      method: 'PUT',
      pathParams: [
        'tableId',
        'queryId'
      ],
      queryParams: [],
      pathConstructor: function(p) {
        return `/tables/${p.tableId}/query/${p.queryId}`;
      }
    },
    {
      text: 'Delete a query',
      method: 'DELETE',
      pathParams: [
        'tableId',
        'queryId'
      ],
      queryParams: [],
      pathConstructor: function(p) {
        return `/tables/${p.tableId}/query/${p.queryId}`;
      }
    },
    {
      text: 'List aggregations',
      method: 'GET',
      pathParams: ['tableId'],
      queryParams: [],
      pathConstructor: function(p) {
        return `/tables/${p.tableId}/aggregations`;
      }
    },
    {
      text: 'Create an aggregation',
      method: 'POST',
      pathParams: ['tableId'],
      queryParams: [],
      pathConstructor: function(p) {
        return `/tables/${p.tableId}/aggregations`;
      }
    },
    {
      text: 'Look up an aggregation',
      method: 'GET',
      pathParams: [
        'tableId',
        'aggregationId'
      ],
      queryParams: [],
      pathConstructor: function(p) {
        return `/tables/${p.tableId}/aggregation/${p.aggregationId}`;
      }
    },
    {
      text: 'Update an aggregation',
      method: 'PUT',
      pathParams: [
        'tableId',
        'aggregationId'
      ],
      queryParams: [],
      pathConstructor: function(p) {
        return `/tables/${p.tableId}/aggregation/${p.aggregationId}`;
      }
    },
    {
      text: 'Delete an aggregation',
      method: 'DELETE',
      pathParams: [
        'tableId',
        'aggregationId'
      ],
      queryParams: [],
      pathConstructor: function(p) {
        return `/tables/${p.tableId}/aggregation/${p.aggregationId}`;
      }
    },
    {
      text: 'Increment or decrement a field in a Tulip Table record',
      method: 'PATCH',
      pathParams: [
        'tableId',
        'recordId'
      ],
      queryParams: [],
      pathConstructor: function(p) {
        return `/tables/${p.tableId}/records/${p.recordId}/increment`;
      }
    },
    {
      text: 'Link records',
      method: 'PUT',
      pathParams: [
        'linkId'
      ],
      queryParams: [],
      pathConstructor: function(p) {
        return `/tableLinks/${p.linkId}/link`;
      }
    },
    {
      text: 'Unlink records',
      method: 'PUT',
      pathParams: [
        'linkId'
      ],
      queryParams: [],
      pathConstructor: function(p) {
        return `/tableLinks/${p.linkId}/link`;
      }
    },
    {
      text: 'Create a table link relationship',
      method: 'POST',
      pathParams: [],
      queryParams: [],
      pathConstructor: function(p) {
        return `/tableLinks`;
      }
    },
    {
      text: 'Fetch link information',
      method: 'GET',
      pathParams: [
        'linkId'
      ],
      queryParams: [],
      pathConstructor: function(p) {
        return `/tableLinks/${p.linkId}`;
      }
    },
    {
      text: 'Update the column labels for link',
      method: 'PUT',
      pathParams: [
        'linkId'
      ],
      queryParams: [],
      pathConstructor: function(p) {
        return `/tableLinks/${p.linkId}`;
      }
    },
  ];

  exports.FUNCTION_TYPES = [
    'sum',
    'count',
    'avg',
    'min',
    'max',
    'mode'
  ];
})(typeof exports === 'undefined' ? this['tulip_tables_common'] = {} : exports);
