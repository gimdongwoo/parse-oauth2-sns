import request from 'request';
import qs from 'querystring';

const methods = ['get', 'post', 'put', 'patch', 'del'];
const DEFAULT_TIMEOUT = 15000;

function makeHeaders(headers, req) {
  const _header = {
    'X-Parse-Application-Id': process.env.APP_ID || 'myAppId',
    'Content-Type': 'application/json'
  };

  if (headers && headers.useMasterKey) {
    delete headers.useMasterKey;
    _header['X-Parse-Master-Key'] = process.env.MASTER_KEY || 'myMasterKey';
  }

  const _headers = Object.assign({}, _header, headers || {});

  // // sessionToken from session
  // const { session = {} } = req;
  // // req header first
  // const _sessionToken = req.headers.sessiontoken || req.headers.sessionToken || session.sessiontoken || session.sessionToken || (session.user && (session.user.sessiontoken || session.user.sessionToken));
  // if (_sessionToken) {
  //   _headers['X-Parse-Session-Token'] = _sessionToken;
  // }

  return _headers;
}

function handleRequestError(reject, error, body) {
  if (error && error.code === 'ETIMEDOUT') {
    return reject({ code: 124, error: 'Request timeout' });
  }

  if (typeof reject === 'function') {
    reject(error || body);
  }
}

function qsStringify(str) {
  const oldEscape = qs.escape;
  qs.escape = function (q) { return q; };
  const stringified = qs.stringify(str);
  qs.escape = oldEscape;
  return stringified;
}

function makeUrl(url, data) {
  if (!data) return url;

  const query = JSON.parse(JSON.stringify(data)); // deep clone object

  // default order
  if (!query.objectId && !query.order) query.order = '-createdAt';

  // if the user wants to add 'include' or 'key' (or other types of) constraints while getting only one object
  // objectId can be added to the query object and is deleted after it's appended to the url
  if (query.objectId) {
    url += '/' + query.objectId;
    delete query.objectId;
  }

  // check to see if there is a 'where' object in the query object
  // the 'where' object need to be stringified by JSON.stringify(), not querystring
  if (typeof query.where === 'object' && Object.keys(query.where).length) {
    url += '?where=' + encodeURIComponent(JSON.stringify(query.where));
  }
  delete query.where;

  // if there are no more constraints left in the query object 'remainingQuery' will be an empty string
  const remainingQuery = qsStringify(query);
  if (remainingQuery) {
    url += (url.indexOf('?') === -1 ? '?' : '&') + remainingQuery;
  }

  return url;
}

function restCall(method, url, data, _headers, formData) {
  const requestUrl = url.indexOf('://') > -1 ? url : process.env.SERVER_URL + url;

  const requestParams = {
    timeout: DEFAULT_TIMEOUT,
    headers: _headers,
    url: requestUrl
  };

  // form, formData
  if (data && !data.fileData) {
    switch (method) {
      case 'patch':
      case 'post':
      case 'put':
        requestParams.body = JSON.stringify(data); // file option
        break;
      default:
        requestParams.url = makeUrl(requestParams.url, data);
        break;
    }
  }

  // add formData
  if (formData) requestParams.formData = formData;

  // log
  if (process.env.NODE_ENV !== 'production') {
    console.log('method :', method);
    console.log('requestParams :', requestParams);
  }

  // file stream
  if (data && data.fileData) {
    requestParams.body = data.fileData.file;
    requestParams.headers['Content-Type'] = data.fileData.mimetype || 'text/plain';
  }

  return new Promise((resolve, reject) => {
    request[method](requestParams, (error, response, body) => {
      try {
        body = ((typeof body === 'string' && body) ? JSON.parse(body) : body);
        error = ((typeof error === 'string' && error) ? JSON.parse(error) : error);

        if (typeof body === 'object') {
          const _keys = Object.keys(body);
          if (_keys.length === 1 && (_keys[0] === 'results' || _keys[0] === 'result')) {
            body = body[_keys[0]];
          }
        }
      } catch (err) {
        console.error('JSON.parse error : ', err);
      } finally {
        // return 200: success, 204: no content
        // xhr.status >= 200 && xhr.status < 300
        if (!error && response.statusCode >= 200 && response.statusCode < 300) {
          resolve(body);
        } else {
          console.error('apiCall error : ', error, body);
          handleRequestError(reject, error, body);
        }
      }
    });
  });
}

/**
* api call
* @method ['get', 'post', 'put', 'patch', 'del']
* @param (String) url
* @param (Object) data
* @param (Object) headers
* @param (Object) formData
*/
export default class ParseRest {
  constructor(req) {
    methods.forEach((method) => {
      this[method] = (url, data, headers, formData) => {
        return restCall(method, url, data, makeHeaders(headers, req), formData);
      };
    });
  }
}
