// error code
// 101: ObjectNotFound
// 102: InvalidQuery

import { Router } from 'express';
import { OAuth2 } from 'oauth';
import path from 'path';
import ParseRest from 'parse-rest-nodejs';

// keep user info to session = default
function defaultUserHandler(req, _user) {
  // error
  if (!_user) return {};

  // login results
  if (_user.sessionToken) req.session.sessionToken = _user.sessionToken;

  req.session.user = _user;
  req.session.user.sessionToken = req.session.sessionToken;
  return req.session.user;
}

function fbOAuth2() {
  const appId = typeof process.env.FB_APPIDS === 'object' ? process.env.FB_APPIDS[0] : process.env.FB_APPIDS;
  const secret = typeof process.env.FB_SECRETS === 'object' ? process.env.FB_SECRETS[0] : process.env.FB_SECRETS;
  return new OAuth2(appId,
    secret,
    '',
    'https://www.facebook.com/dialog/oauth',
    'https://graph.facebook.com/oauth/access_token',
    null
  );
}

function instaOAuth2() {
  const appId = typeof process.env.INSTA_APPIDS === 'object' ? process.env.INSTA_APPIDS[0] : process.env.INSTA_APPIDS;
  const secret = typeof process.env.INSTA_SECRETS === 'object' ? process.env.INSTA_SECRETS[0] : process.env.INSTA_SECRETS;
  return new OAuth2(appId,
    secret,
    '',
    'https://api.instagram.com/oauth/authorize/',
    'https://api.instagram.com/oauth/access_token',
    null
  );
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

    // instagram
    api.get('/instagram/auth', (req, res) => router.instagramAuth(req, res));
    api.get('/instagram/callback', (req, res) => router.instagramCallback(req, res));
    api.post('/instagram/link', (req, res) => router.instagramLink(req, res));
    api.get('/instagram/recent', (req, res) => router.instagramRecent(req, res));

    return api;
  }

  constructor(options) {
    const _path = options.path;
    const _userHandler = options.userHandler;

    // facebook
    this.fbOAuth2 = fbOAuth2();
    this.fbRedirectUri = path.join(_path, '/facebook/callback');

    // instagram
    this.instaOAuth2 = instaOAuth2();
    this.instaRedirectUri = path.join(_path, '/instagram/callback');

    // userHandler
    this.userHandler = _userHandler;
  }

  //
  // facebook
  //
  facebookAuth(req, res) {
    // For eg. "http://localhost:3000/facebook/callback"
    const redirectUri = (req.secure ? 'https' : 'http') + '://' + path.join(req.get('host'), this.fbRedirectUri);
    const params = { redirect_uri: redirectUri, scope: 'email,public_profile' };
    console.log('params', params);
    return res.redirect(this.fbOAuth2.getAuthorizeUrl(params));
  }

  facebookCallback(req, res) {
    if (req.error_reason) {
      res.send(req.error_reason);
    }
    if (req.query && req.query.code) {
      const redirectUri = (req.secure ? 'https' : 'http') + '://' + path.join(req.get('host'), this.fbRedirectUri);
      // For eg. "/facebook/callback"
      this.fbOAuth2.getOAuthAccessToken(req.query.code, {
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      }, (err, accessToken, refreshToken, params) => {
        if (err) {
          console.error(err);
          return res.send(err);
        }

        const facebookAuth = {
          access_token: accessToken,
          expiration_date: params.expires
        };
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

    const userHandler = this.userHandler || defaultUserHandler;

    // https://developers.facebook.com/docs/graph-api/reference/v2.2/user
    this.fbOAuth2.get('https://graph.facebook.com/me?fields=id,name,email', accessToken, (err, data/* , response */) => {
      if (err) {
        return errorFn(err);
      }

      const profile = JSON.parse(data);
      console.log(profile);
      const profileImageUrl = 'https://graph.facebook.com/' + profile.id + '/picture';

      const _authData = {
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
          // authData save
          const _newAuthData = { ...user.authData, ..._authData };
          // login count
          const loginCount = (user.loginCount || 0) + 1;
          // save param
          const _param = { authData: _newAuthData, loginCount };
          parseRest.put('/users/' + user.objectId, _param, { useMasterKey: true }).then(() => {
            // session query
            parseRest.get('/sessions', { where: { user: { __type: 'Pointer', className: '_User', objectId: user.objectId } } }, { useMasterKey: true }).then((sessions) => {
              if (sessions && sessions[0]) {
                const _session = sessions[0];
                req.session.sessionToken = _session.sessionToken;
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
            password: profile.id,
            name: profile.name,
            email: profile.email,
            socialType: 'facebook',
            socialProfile: profile,
            profileImage: { url: profileImageUrl },
            authData: _authData,
            loginCount: 1
          };
          parseRest.post('/users', user, { useMasterKey: true }).then((result) => {
            req.session.sessionToken = result.sessionToken;
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
    const redirectUri = (req.secure ? 'https' : 'http') + '://' + path.join(req.get('host'), this.instaRedirectUri);
    const params = { redirect_uri: redirectUri, scope: 'basic public_content', response_type: 'code' };
    console.log('params', params);
    return res.redirect(this.instaOAuth2.getAuthorizeUrl(params));
  }

  instagramCallback(req, res) {
    if (req.error_reason) {
      res.send(req.error_reason);
    }
    if (req.query && req.query.code) {
      const redirectUri = (req.secure ? 'https' : 'http') + '://' + path.join(req.get('host'), this.instaRedirectUri);
      // For eg. "/instagram/callback"
      this.instaOAuth2.getOAuthAccessToken(req.query.code, {
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      }, (err, accessToken, refreshToken, params) => {
        if (err) {
          console.error(err);
          return res.send(err);
        }

        const instagramAuth = {
          access_token: accessToken,
          user: params.user
        };
        return res.json(instagramAuth);
      });
    }
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
    if (!accessToken) return res.status(500).json({ code: 101, error: 'Invalid facebook access_token' }).end();
    if (!userId && !username) return res.status(500).json({ code: 102, error: 'Invalid parameter : userId or username' }).end();

    function errorFn(err) {
      console.error(err);
      return res.status(500).json(err).end();
    }

    const userHandler = this.userHandler || defaultUserHandler;

    this.instaOAuth2.get('https://api.instagram.com/v1/users/self/', accessToken, (err, data/* , response */) => {
      if (err) {
        console.error(err);
        res.send(err);
      } else {
        const profile = JSON.parse(data).data;
        console.log(profile);

        const _authData = {
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
            const _newAuthData = { ...user.authData, ..._authData };
            return parseRest.put('/users/' + user.objectId, { authData: _newAuthData }, { useMasterKey: true }).then(() => {
              // keep
              user.authData = _newAuthData;
              // session query
              parseRest.get('/sessions', { where: { user: { __type: 'Pointer', className: '_User', objectId: user.objectId } } }, { useMasterKey: true }).then((sessions) => {
                if (sessions && sessions[0]) {
                  const _session = sessions[0];
                  req.session.sessionToken = _session.sessionToken;
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
}
