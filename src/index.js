// error code
// 101: ObjectNotFound
// 102: InvalidQuery

import { Router } from 'express';
import qs from 'querystring';
import { OAuth2 } from 'oauth';
import path from 'path';
import ParseRest from 'parse-rest-nodejs';

function qsStringify(str) {
  const oldEscape = qs.escape;
  qs.escape = function (q) { return q; };
  const stringified = qs.stringify(str);
  qs.escape = oldEscape;
  return stringified;
}

// keep user info to session = default
function defaultUserHandler(req, _user) {
  // error
  if (!_user) return {};

  // login results
  if (typeof req.session === 'object') {
    if (_user.sessionToken) req.session.sessionToken = _user.sessionToken;

    req.session.user = _user;
    req.session.user.sessionToken = req.session.sessionToken;

    return req.session.user;
  }
  return _user;
}

function keyConverter(_envKey) {
  let returnKey = _envKey;

  if (typeof _envKey === 'object' && Array.isArray(_envKey)) {
    returnKey = _envKey[0];
  } else if (typeof _envKey === 'string' && _envKey.indexOf('[') > -1) {
    returnKey = (JSON.parse(_envKey))[0];
  }

  return returnKey;
}

function fbOAuth2() {
  const appId = keyConverter(process.env.FB_APPIDS);
  const secret = keyConverter(process.env.FB_SECRETS);
  return new OAuth2(appId,
    secret,
    '',
    'https://www.facebook.com/dialog/oauth',
    'https://graph.facebook.com/oauth/access_token',
    null
  );
}

function googleOAuth2() {
  const appId = keyConverter(process.env.GOOGLE_APPIDS);
  const secret = keyConverter(process.env.GOOGLE_SECRETS);
  return new OAuth2(appId,
    secret,
    '',
    'https://accounts.google.com/o/oauth2/v2/auth',
    'https://www.googleapis.com/oauth2/v4/token',
    null
  );
}

function instaOAuth2() {
  const appId = keyConverter(process.env.INSTA_APPIDS);
  const secret = keyConverter(process.env.INSTA_SECRETS);
  return new OAuth2(appId,
    secret,
    '',
    'https://api.instagram.com/oauth/authorize/',
    'https://api.instagram.com/oauth/access_token',
    null
  );
}

function naverOAuth2() {
  const appId = keyConverter(process.env.NAVER_APPIDS);
  const secret = keyConverter(process.env.NAVER_SECRETS);
  return new OAuth2(appId,
    secret,
    '',
    'https://nid.naver.com/oauth2.0/authorize',
    'https://nid.naver.com/oauth2.0/token',
    null
  );
}

function daumOAuth2() {
  const appId = keyConverter(process.env.DAUM_APPIDS);
  const secret = keyConverter(process.env.DAUM_SECRETS);
  return new OAuth2(appId,
    secret,
    '',
    'https://apis.daum.net/oauth2/authorize',
    'https://apis.daum.net/oauth2/token',
    null
  );
}

function makeRedirectUri(req, redirectUri) {
  let _redirectUri = (req.secure ? 'https' : 'http') + '://' + path.join(req.query.host || req.get('host'), redirectUri);
  const _urlQuery = [];
  if (req.query && req.query.callback) _urlQuery.push('callback=' + encodeURIComponent(req.query.callback));
  if (req.query && req.query.host) _urlQuery.push('host=' + encodeURIComponent(req.query.host));
  if (_urlQuery.length) _redirectUri += '?' + _urlQuery.join('&');

  return _redirectUri;
}

export default class SocialOAuth2 {
  /**
   * @param {Object?} api - Express router
   * @return {Object} express router
   */
  static create(options, api = Router()) {
    const router = new SocialOAuth2(options);

    // facebook
    api.get('/facebook/auth', (req, res) => router.facebookAuth(req, res));
    api.get('/facebook/callback', (req, res) => router.facebookCallback(req, res));
    api.post('/facebook/login', (req, res) => router.facebookLogin(req, res));

    // google
    api.get('/google/auth', (req, res) => router.googleAuth(req, res));
    api.get('/google/callback', (req, res) => router.googleCallback(req, res));
    api.post('/google/login', (req, res) => router.googleLogin(req, res));

    // instagram
    api.get('/instagram/auth', (req, res) => router.instagramAuth(req, res));
    api.get('/instagram/callback', (req, res) => router.instagramCallback(req, res));
    api.post('/instagram/login', (req, res) => router.instagramLogin(req, res));
    api.post('/instagram/link', (req, res) => router.instagramLink(req, res));
    api.get('/instagram/recent', (req, res) => router.instagramRecent(req, res));

    // naver
    api.get('/naver/auth', (req, res) => router.naverAuth(req, res));
    api.get('/naver/callback', (req, res) => router.naverCallback(req, res));
    api.post('/naver/login', (req, res) => router.naverLogin(req, res));

    // daum
    api.get('/daum/auth', (req, res) => router.daumAuth(req, res));
    api.get('/daum/callback', (req, res) => router.daumCallback(req, res));
    api.post('/daum/login', (req, res) => router.daumLogin(req, res));

    return api;
  }

  constructor(options) {
    const _path = options.path;
    const _userHandler = options.userHandler;

    // facebook
    this.fbOAuth2 = fbOAuth2();
    this.fbRedirectUri = path.join(_path, '/facebook/callback');

    // google
    this.googleOAuth2 = googleOAuth2();
    this.googleRedirectUri = path.join(_path, '/google/callback');

    // instagram
    this.instaOAuth2 = instaOAuth2();
    this.instaRedirectUri = path.join(_path, '/instagram/callback');

    // naver
    this.naverOAuth2 = naverOAuth2();
    this.naverRedirectUri = path.join(_path, '/naver/callback');

    // daum
    this.daumOAuth2 = daumOAuth2();
    this.daumRedirectUri = path.join(_path, '/daum/callback');

    // userHandler
    this.userHandler = _userHandler;
  }

  //
  // facebook
  //
  facebookAuth(req, res) {
    // For eg. "http://localhost:3000/facebook/callback"
    const params = { redirect_uri: makeRedirectUri(req, this.fbRedirectUri), scope: 'email,public_profile' };
    console.log('params', params);
    return res.redirect(this.fbOAuth2.getAuthorizeUrl(params));
  }

  facebookCallback(req, res) {
    if (req.error_reason) {
      res.send(req.error_reason);
    }
    if (req.query && req.query.code) {
      // For eg. "/facebook/callback"
      this.fbOAuth2.getOAuthAccessToken(req.query.code, {
        grant_type: 'authorization_code',
        redirect_uri: makeRedirectUri(req, this.fbRedirectUri)
      }, (err, accessToken, refreshToken, params) => {
        if (err) {
          console.error(err);
          return res.send(err);
        }

        const facebookAuth = {
          access_token: accessToken,
          expiration_date: params.expires
        };
        // when custom callback
        if (req.query && req.query.callback) {
          let joint = req.query.callback.indexOf('?') > -1 ? '&' : '?';
          return res.redirect(req.query.callback + joint + qsStringify(facebookAuth));
        }
        return res.json(facebookAuth);
      });
    }
  }

  /**
   * @param {String} accessToken
   * @return {Object} parse user
   */
  facebookLogin(req, res) {
    const { body = {}, session = {} } = req;
    console.log('body', body);
    console.log('session', session);
    const accessToken = body.access_token || session.access_token;
    const expires = body.expiration_date || session.expiration_date;
    if (!accessToken) return res.status(500).json({ code: 101, error: 'Invalid facebook access_token' }).end();

    function errorFn(err) {
      console.error(err);
      return res.status(500).json(err).end();
    }

    const userHandler = (_req, _user) => {
      let user = defaultUserHandler(_req, _user);
      if (this.userHandler) user = this.userHandler(_req, user);
      return user;
    };

    // https://developers.facebook.com/docs/graph-api/reference/v2.2/user
    this.fbOAuth2.get('https://graph.facebook.com/me?fields=id,name,email', accessToken, (err, data/* , response */) => {
      if (err) {
        return errorFn(err);
      }

      const profile = JSON.parse(data);
      console.log(profile);
      const profileImageUrl = 'https://graph.facebook.com/' + profile.id + '/picture';

      const authData = {
        facebook: {
          id: profile.id,
          access_token: accessToken,
          expiration_date: expires
        }
      };

      const parseRest = new ParseRest(req);
      parseRest.get('/users', { where: { username: profile.email } }, { useMasterKey: true }).then((users) => {
        if (users && users[0]) {
          // Retrieving
          const user = users[0];
          // ban user
          if (user.isBanned) return errorFn({ code: 101, error: 'User is banned' });
          // save param
          const _param = { authData };
          parseRest.put('/users/' + user.objectId, _param, { useMasterKey: true }).then(() => {
            // session query
            parseRest.get('/sessions', { where: { user: { __type: 'Pointer', className: '_User', objectId: user.objectId } } }, { useMasterKey: true }).then((sessions) => {
              if (sessions && sessions[0]) {
                const _session = sessions[0];
                if (typeof req.session === 'object') req.session.sessionToken = _session.sessionToken;
                // end
                return res.json(userHandler(req, { ...user, ..._param }));
              }
              return errorFn({ code: 101, error: 'sessions not exist' });
            }, errorFn);
          }, errorFn);
        } else {
          // New
          const user = {
            username: profile.email,
            password: (typeof profile.id === 'number' ? profile.id.toString() : profile.id),
            name: profile.name,
            email: profile.email,
            socialType: 'facebook',
            socialProfile: profile,
            profileImage: { url: profileImageUrl },
            authData
          };
          parseRest.post('/users', user, { useMasterKey: true }).then((result) => {
            if (typeof req.session === 'object') req.session.sessionToken = result.sessionToken;
            // reload
            parseRest.get('/users/me').then((_user) => {
              // end
              return res.json(userHandler(req, _user));
            }, errorFn);
          }, errorFn);
        }
      }, errorFn);
    });
  }

  //
  // google
  //
  googleAuth(req, res) {
    // For eg. "http://localhost:3000/google/callback"
    const params = { redirect_uri: makeRedirectUri(req, this.googleRedirectUri), scope: 'email profile', response_type: 'code' };
    console.log('params', params);
    return res.redirect(this.googleOAuth2.getAuthorizeUrl(params));
  }

  googleCallback(req, res) {
    if (req.error_reason) {
      res.send(req.error_reason);
    }
    if (req.query && req.query.code) {
      // For eg. "/google/callback"
      this.googleOAuth2.getOAuthAccessToken(req.query.code, {
        grant_type: 'authorization_code',
        redirect_uri: makeRedirectUri(req, this.googleRedirectUri)
      }, (err, accessToken, refreshToken, params) => {
        if (err) {
          console.error(err);
          return res.send(err);
        }

        const googleAuth = {
          access_token: accessToken,
          expiration_date: params.expires_in
        };
        // when custom callback
        if (req.query && req.query.callback) {
          let joint = req.query.callback.indexOf('?') > -1 ? '&' : '?';
          return res.redirect(req.query.callback + joint + qsStringify(googleAuth));
        }
        return res.json(googleAuth);
      });
    }
  }

  /**
   * @param {String} accessToken
   * @return {Object} parse user
   */
  googleLogin(req, res) {
    const { body = {}, session = {} } = req;
    console.log('body', body);
    console.log('session', session);
    const accessToken = body.access_token || session.access_token;
    const expires = body.expiration_date || session.expiration_date;
    if (!accessToken) return res.status(500).json({ code: 101, error: 'Invalid google access_token' }).end();

    function errorFn(err) {
      console.error(err);
      return res.status(500).json(err).end();
    }

    const userHandler = (_req, _user) => {
      let user = defaultUserHandler(_req, _user);
      if (this.userHandler) user = this.userHandler(_req, user);
      return user;
    };

    // https://developers.google.com/oauthplayground
    this.googleOAuth2.get('https://www.googleapis.com/oauth2/v2/userinfo', accessToken, (err, data/* , response */) => {
      if (err) {
        return errorFn(err);
      }

      const profile = JSON.parse(data);
      console.log(profile);
      const profileImageUrl = profile.picture;

      const authData = {
        google: {
          id: profile.id,
          access_token: accessToken,
          expiration_date: expires
        }
      };

      const parseRest = new ParseRest(req);
      parseRest.get('/users', { where: { username: profile.email } }, { useMasterKey: true }).then((users) => {
        if (users && users[0]) {
          // Retrieving
          const user = users[0];
          // ban user
          if (user.isBanned) return errorFn({ code: 101, error: 'User is banned' });
          // save param
          const _param = { authData };
          parseRest.put('/users/' + user.objectId, _param, { useMasterKey: true }).then(() => {
            // session query
            parseRest.get('/sessions', { where: { user: { __type: 'Pointer', className: '_User', objectId: user.objectId } } }, { useMasterKey: true }).then((sessions) => {
              if (sessions && sessions[0]) {
                const _session = sessions[0];
                if (typeof req.session === 'object') req.session.sessionToken = _session.sessionToken;
                // end
                return res.json(userHandler(req, { ...user, ..._param }));
              }
              return errorFn({ code: 101, error: 'sessions not exist' });
            }, errorFn);
          }, errorFn);
        } else {
          // New
          const user = {
            username: profile.email,
            password: (typeof profile.id === 'number' ? profile.id.toString() : profile.id),
            name: profile.name,
            email: profile.email,
            socialType: 'google',
            socialProfile: profile,
            profileImage: { url: profileImageUrl },
            authData
          };
          parseRest.post('/users', user, { useMasterKey: true }).then((result) => {
            if (typeof req.session === 'object') req.session.sessionToken = result.sessionToken;
            // reload
            parseRest.get('/users/me').then((_user) => {
              // end
              return res.json(userHandler(req, _user));
            }, errorFn);
          }, errorFn);
        }
      }, errorFn);
    });
  }

  //
  // instagram
  //
  instagramAuth(req, res) {
    // For eg. "http://localhost:3000/instagram/callback"
    const params = { redirect_uri: makeRedirectUri(req, this.instaRedirectUri), scope: 'basic public_content', response_type: 'code' };
    console.log('params', params);
    return res.redirect(this.instaOAuth2.getAuthorizeUrl(params));
  }

  instagramCallback(req, res) {
    if (req.error_reason) {
      res.send(req.error_reason);
    }
    if (req.query && req.query.code) {
      // For eg. "/instagram/callback"
      this.instaOAuth2.getOAuthAccessToken(req.query.code, {
        grant_type: 'authorization_code',
        redirect_uri: makeRedirectUri(req, this.instaRedirectUri)
      }, (err, accessToken, refreshToken, params) => {
        if (err) {
          console.error(err);
          return res.send(err);
        }

        const instagramAuth = {
          access_token: accessToken,
          user: params.user
        };
        // when custom callback
        if (req.query && req.query.callback) {
          let joint = req.query.callback.indexOf('?') > -1 ? '&' : '?';
          return res.redirect(req.query.callback + joint + qsStringify(instagramAuth));
        }
        return res.json(instagramAuth);
      });
    }
  }

  /**
   * @param {String} accessToken
   * @return {Object} parse user
   */
  instagramLogin(req, res) {
    const { body = {}, session = {} } = req;
    console.log('body', body);
    console.log('session', session);
    const accessToken = body.access_token || session.access_token;
    if (!accessToken) return res.status(500).json({ code: 101, error: 'Invalid instagram access_token' }).end();

    function errorFn(err) {
      console.error(err);
      return res.status(500).json(err).end();
    }

    const userHandler = (_req, _user) => {
      let user = defaultUserHandler(_req, _user);
      if (this.userHandler) user = this.userHandler(_req, user);
      return user;
    };

    // https://www.instagram.com/developer/endpoints/users/
    this.instaOAuth2.get('https://api.instagram.com/v1/users/self/', accessToken, (err, data/* , response */) => {
      if (err) {
        return errorFn(err);
      }

      const profile = JSON.parse(data).data;
      console.log(profile);

      const authData = {
        instagram: {
          id: profile.id,
          access_token: accessToken
        }
      };

      const parseRest = new ParseRest(req);
      parseRest.get('/users', { where: { username: profile.username } }, { useMasterKey: true }).then((users) => {
        if (users && users[0]) {
          // Retrieving
          const user = users[0];
          // ban user
          if (user.isBanned) return errorFn({ code: 101, error: 'User is banned' });
          // save param
          const _param = { authData };
          parseRest.put('/users/' + user.objectId, _param, { useMasterKey: true }).then(() => {
            // session query
            parseRest.get('/sessions', { where: { user: { __type: 'Pointer', className: '_User', objectId: user.objectId } } }, { useMasterKey: true }).then((sessions) => {
              if (sessions && sessions[0]) {
                const _session = sessions[0];
                if (typeof req.session === 'object') req.session.sessionToken = _session.sessionToken;
                // end
                return res.json(userHandler(req, { ...user, ..._param }));
              }
              return errorFn({ code: 101, error: 'sessions not exist' });
            }, errorFn);
          }, errorFn);
        } else {
          // New
          const user = {
            username: profile.username,
            password: (typeof profile.id === 'number' ? profile.id.toString() : profile.id),
            name: profile.full_name,
            // email: profile.email,
            socialType: 'instagram',
            socialProfile: profile,
            profileImage: { url: profile.profile_picture },
            authData
          };
          parseRest.post('/users', user, { useMasterKey: true }).then((result) => {
            if (typeof req.session === 'object') req.session.sessionToken = result.sessionToken;
            // reload
            parseRest.get('/users/me').then((_user) => {
              // end
              return res.json(userHandler(req, _user));
            }, errorFn);
          }, errorFn);
        }
      }, errorFn);
    });
  }

  /**
   * @param {String} accessToken
   * @return {Object} parse user
   */
  instagramLink(req, res) {
    const { body = {}, session = {} } = req;
    console.log('body', body);
    console.log('session', session);
    const accessToken = body.access_token || session.access_token;
    const userId = body.userId || (session.user && session.user.objectId);
    const username = body.username || (session.user && session.user.username);
    if (!accessToken) return res.status(500).json({ code: 101, error: 'Invalid instagram access_token' }).end();
    if (!userId && !username) return res.status(500).json({ code: 102, error: 'Invalid parameter : userId or username' }).end();

    function errorFn(err) {
      console.error(err);
      return res.status(500).json(err).end();
    }

    const userHandler = (_req, _user) => {
      let user = defaultUserHandler(_req, _user);
      if (this.userHandler) user = this.userHandler(_req, user);
      return user;
    };

    this.instaOAuth2.get('https://api.instagram.com/v1/users/self/', accessToken, (err, data/* , response */) => {
      if (err) {
        console.error(err);
        res.send(err);
      } else {
        const profile = JSON.parse(data).data;
        console.log(profile);

        const authData = {
          instagram: {
            id: profile.id,
            access_token: accessToken
          }
        };

        const parseRest = new ParseRest(req);
        const _where = userId ? { objectId: userId } : { username };
        parseRest.get('/users', { where: _where }, { useMasterKey: true }).then((users) => {
          if (users && users[0]) {
            // Retrieving
            const user = users[0];
            // authData save
            const newAuthData = { ...user.authData, ...authData };
            return parseRest.put('/users/' + user.objectId, { authData: newAuthData }, { useMasterKey: true }).then(() => {
              // keep
              user.authData = newAuthData;
              // session query
              parseRest.get('/sessions', { where: { user: { __type: 'Pointer', className: '_User', objectId: user.objectId } } }, { useMasterKey: true }).then((sessions) => {
                if (sessions && sessions[0]) {
                  const _session = sessions[0];
                  if (typeof req.session === 'object') req.session.sessionToken = _session.sessionToken;
                  // end
                  return res.json(userHandler(req, user));
                }
                return errorFn({ code: 101, error: 'sessions not exist' });
              }, errorFn);
            }, errorFn);
          }
          return errorFn({ code: 101, error: 'user not exist' });
        }, errorFn);
      }
    });
  }

  /**
   * @param {String} userId
   * @return {Array} instagram recent media
   */
  instagramRecent(req, res) {
    const { query = {}, session = {} } = req;
    console.log('query', query);
    console.log('session', session);
    const userId = query.userId || (session.user && session.user.objectId);
    if (!userId) return res.status(500).json({ code: 102, error: 'Invalid parameter : userId' }).end();

    function errorFn(err) {
      console.error(err);
      return res.status(500).json(err).end();
    }

    const parseRest = new ParseRest(req);
    parseRest.get('/users', { where: { objectId: userId } }, { useMasterKey: true }).then((users) => {
      if (users && users[0]) {
        // Retrieving
        const user = users[0];
        // get instagram authData
        const accessToken = user.authData && user.authData.instagram && user.authData.instagram.access_token;
        if (!accessToken) return errorFn({ code: 101, error: 'Invalid instagram access_token' });

        // get recent
        return this.instaOAuth2.get('https://api.instagram.com/v1/users/self/media/recent/', accessToken, (err, data/* , response */) => {
          if (err) {
            return errorFn(err);
          }

          const recent = JSON.parse(data).data;
          // end
          return res.json(recent);
        });
      }
      return errorFn('user not exist');
    });
  }

  //
  // naver
  //
  naverAuth(req, res) {
    // For eg. "http://localhost:3000/naver/callback"
    const params = { redirect_uri: makeRedirectUri(req, this.naverRedirectUri), response_type: 'code'  };
    console.log('params', params);
    return res.redirect(this.naverOAuth2.getAuthorizeUrl(params));
  }

  naverCallback(req, res) {
    if (req.error_reason) {
      res.send(req.error_reason);
    }
    if (req.query && req.query.code) {
      // For eg. "/naver/callback"
      this.naverOAuth2.getOAuthAccessToken(req.query.code, {
        grant_type: 'authorization_code',
        redirect_uri: makeRedirectUri(req, this.naverRedirectUri)
      }, (err, accessToken, refreshToken, params) => {
        if (err) {
          console.error(err);
          return res.send(err);
        }

        const naverAuth = {
          access_token: accessToken,
          expiration_date: params.expires_in
        };
        // when custom callback
        if (req.query && req.query.callback) {
          let joint = req.query.callback.indexOf('?') > -1 ? '&' : '?';
          return res.redirect(req.query.callback + joint + qsStringify(naverAuth));
        }
        return res.json(naverAuth);
      });
    }
  }

  /**
   * @param {String} accessToken
   * @return {Object} parse user
   */
  naverLogin(req, res) {
    const { body = {}, session = {} } = req;
    console.log('body', body);
    console.log('session', session);
    const accessToken = body.access_token || session.access_token;
    const expires = body.expiration_date || session.expiration_date;
    if (!accessToken) return res.status(500).json({ code: 101, error: 'Invalid naver access_token' }).end();

    function errorFn(err) {
      console.error(err);
      return res.status(500).json(err).end();
    }

    const userHandler = (_req, _user) => {
      let user = defaultUserHandler(_req, _user);
      if (this.userHandler) user = this.userHandler(_req, user);
      return user;
    };

    // https://developers.naver.com/docs/login/profile/
    this.naverOAuth2.get('https://openapi.naver.com/v1/nid/me', accessToken, (err, data/* , response */) => {
      if (err) {
        return errorFn(err);
      }

      const profile = (JSON.parse(data)).response;
      console.log(profile);

      const authDataEtc = {
        naver: {
          id: profile.id,
          access_token: accessToken,
          expiration_date: expires
        }
      };

      const parseRest = new ParseRest(req);
      parseRest.get('/users', { where: { username: profile.email } }, { useMasterKey: true }).then((users) => {
        if (users && users[0]) {
          // Retrieving
          const user = users[0];
          // ban user
          if (user.isBanned) return errorFn({ code: 101, error: 'User is banned' });
          // save param
          const _param = { authDataEtc };
          parseRest.put('/users/' + user.objectId, _param, { useMasterKey: true }).then(() => {
            // session query
            parseRest.get('/sessions', { where: { user: { __type: 'Pointer', className: '_User', objectId: user.objectId } } }, { useMasterKey: true }).then((sessions) => {
              if (sessions && sessions[0]) {
                const _session = sessions[0];
                if (typeof req.session === 'object') req.session.sessionToken = _session.sessionToken;
                // end
                return res.json(userHandler(req, { ...user, ..._param }));
              }
              return errorFn({ code: 101, error: 'sessions not exist' });
            }, errorFn);
          }, errorFn);
        } else {
          // New
          const user = {
            username: profile.email,
            password: (typeof profile.id === 'number' ? profile.id.toString() : profile.id),
            name: profile.name,
            email: profile.email,
            socialType: 'naver',
            socialProfile: profile,
            profileImage: { url: profile.profile_image },
            authDataEtc
          };
          parseRest.post('/users', user, { useMasterKey: true }).then((result) => {
            if (typeof req.session === 'object') req.session.sessionToken = result.sessionToken;
            // reload
            parseRest.get('/users/me').then((_user) => {
              // end
              return res.json(userHandler(req, _user));
            }, errorFn);
          }, errorFn);
        }
      }, errorFn);
    });
  }

  //
  // daum
  //
  daumAuth(req, res) {
    // For eg. "http://localhost:3000/daum/callback"
    const params = { redirect_uri: makeRedirectUri(req, this.daumRedirectUri), response_type: 'code'  };
    console.log('params', params);
    return res.redirect(this.daumOAuth2.getAuthorizeUrl(params));
  }

  daumCallback(req, res) {
    if (req.error_reason) {
      res.send(req.error_reason);
    }
    if (req.query && req.query.code) {
      // For eg. "/daum/callback"
      this.daumOAuth2.getOAuthAccessToken(req.query.code, {
        grant_type: 'authorization_code',
        redirect_uri: makeRedirectUri(req, this.daumRedirectUri)
      }, (err, accessToken, refreshToken, params) => {
        if (err) {
          console.error(err);
          return res.send(err);
        }

        const daumAuth = {
          access_token: accessToken,
          expiration_date: params.expires_in
        };
        // when custom callback
        if (req.query && req.query.callback) {
          let joint = req.query.callback.indexOf('?') > -1 ? '&' : '?';
          return res.redirect(req.query.callback + joint + qsStringify(daumAuth));
        }
        return res.json(daumAuth);
      });
    }
  }

  /**
   * @param {String} accessToken
   * @return {Object} parse user
   */
  daumLogin(req, res) {
    const { body = {}, session = {} } = req;
    console.log('body', body);
    console.log('session', session);
    const accessToken = body.access_token || session.access_token;
    const expires = body.expiration_date || session.expiration_date;
    if (!accessToken) return res.status(500).json({ code: 101, error: 'Invalid daum access_token' }).end();

    function errorFn(err) {
      console.error(err);
      return res.status(500).json(err).end();
    }

    const userHandler = (_req, _user) => {
      let user = defaultUserHandler(_req, _user);
      if (this.userHandler) user = this.userHandler(_req, user);
      return user;
    };

    // https://developers.daum.net/services/apis/user/v1/show.format
    this.daumOAuth2.get('https://apis.daum.net/user/v1/show.json', accessToken, (err, data/* , response */) => {
      if (err) {
        return errorFn(err);
      }

      const profile = (JSON.parse(data)).result;
      console.log(profile);

      const authDataEtc = {
        daum: {
          id: profile.id,
          access_token: accessToken,
          expiration_date: expires
        }
      };

      const parseRest = new ParseRest(req);
      parseRest.get('/users', { where: { username: profile.userid } }, { useMasterKey: true }).then((users) => {
        if (users && users[0]) {
          // Retrieving
          const user = users[0];
          // ban user
          if (user.isBanned) return errorFn({ code: 101, error: 'User is banned' });
          // save param
          const _param = { authDataEtc };
          parseRest.put('/users/' + user.objectId, _param, { useMasterKey: true }).then(() => {
            // session query
            parseRest.get('/sessions', { where: { user: { __type: 'Pointer', className: '_User', objectId: user.objectId } } }, { useMasterKey: true }).then((sessions) => {
              if (sessions && sessions[0]) {
                const _session = sessions[0];
                if (typeof req.session === 'object') req.session.sessionToken = _session.sessionToken;
                // end
                return res.json(userHandler(req, { ...user, ..._param }));
              }
              return errorFn({ code: 101, error: 'sessions not exist' });
            }, errorFn);
          }, errorFn);
        } else {
          // New
          const user = {
            username: profile.userid,
            password: (typeof profile.id === 'number' ? profile.id.toString() : profile.id),
            name: profile.nickname,
            // email: profile.email,
            socialType: 'daum',
            socialProfile: profile,
            profileImage: { url: profile.imagePath },
            authDataEtc
          };
          parseRest.post('/users', user, { useMasterKey: true }).then((result) => {
            if (typeof req.session === 'object') req.session.sessionToken = result.sessionToken;
            // reload
            parseRest.get('/users/me').then((_user) => {
              // end
              return res.json(userHandler(req, _user));
            }, errorFn);
          }, errorFn);
        }
      }, errorFn);
    });
  }
}
