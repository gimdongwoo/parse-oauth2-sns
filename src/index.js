// error code
// 101: ObjectNotFound
// 102: InvalidQuery

import { Router } from "express";
import qs from "querystring";
import { OAuth2 } from "oauth";
import path from "path";
import ParseRest from "./ParseRest";

function qsStringify(str) {
  const oldEscape = qs.escape;
  qs.escape = function(q) {
    return q;
  };
  const stringified = qs.stringify(str);
  qs.escape = oldEscape;
  return stringified;
}

// keep user info to session = default
function defaultUserHandler(req, _user) {
  // error
  if (!_user) return {};

  // login results
  if (typeof req.session === "object") {
    if (_user.sessionToken) req.session.sessionToken = _user.sessionToken;

    req.session.user = _user;
    req.session.user.sessionToken = req.session.sessionToken;

    return req.session.user;
  }
  return _user;
}

function keyConverter(_envKey) {
  let returnKey = _envKey;

  if (typeof _envKey === "object" && Array.isArray(_envKey)) {
    [returnKey] = _envKey;
  } else if (typeof _envKey === "string" && _envKey.indexOf("[") > -1) {
    [returnKey] = JSON.parse(_envKey);
  }

  return returnKey;
}

function fbOAuth2() {
  const appId = keyConverter(process.env.FB_APPIDS);
  const secret = keyConverter(process.env.FB_SECRETS);
  return new OAuth2(
    appId,
    secret,
    "",
    "https://www.facebook.com/dialog/oauth",
    "https://graph.facebook.com/oauth/access_token",
    null
  );
}

function googleOAuth2() {
  const appId = keyConverter(process.env.GOOGLE_APPIDS);
  const secret = keyConverter(process.env.GOOGLE_SECRETS);
  return new OAuth2(
    appId,
    secret,
    "",
    "https://accounts.google.com/o/oauth2/v2/auth",
    "https://www.googleapis.com/oauth2/v4/token",
    null
  );
}

function instaOAuth2() {
  const appId = keyConverter(process.env.INSTA_APPIDS);
  const secret = keyConverter(process.env.INSTA_SECRETS);
  return new OAuth2(
    appId,
    secret,
    "",
    "https://api.instagram.com/oauth/authorize/",
    "https://api.instagram.com/oauth/access_token",
    null
  );
}

function naverOAuth2() {
  const appId = keyConverter(process.env.NAVER_APPIDS);
  const secret = keyConverter(process.env.NAVER_SECRETS);
  return new OAuth2(
    appId,
    secret,
    "",
    "https://nid.naver.com/oauth2.0/authorize",
    "https://nid.naver.com/oauth2.0/token",
    null
  );
}

function daumOAuth2() {
  const appId = keyConverter(process.env.DAUM_APPIDS);
  const secret = keyConverter(process.env.DAUM_SECRETS);
  return new OAuth2(
    appId,
    secret,
    "",
    "https://apis.daum.net/oauth2/authorize",
    "https://apis.daum.net/oauth2/token",
    null
  );
}

function kakaoOAuth2() {
  const appId = keyConverter(process.env.KAKAO_RESTKEY);
  const secret = keyConverter(process.env.KAKAO_SECRETS);
  return new OAuth2(
    appId,
    secret,
    "",
    "https://kauth.kakao.com/oauth/authorize",
    "https://kauth.kakao.com/oauth/token",
    null
  );
}

function makeRedirectUri(req, uri) {
  let _host = req.get("host");

  // query keep to session store
  const { callback, host } = req.query;
  if (typeof req.session === "object" && (callback || host)) {
    req.session.oauth2 = { callback, host };
  }

  // host from session store
  if (req.session.oauth2 && req.session.oauth2.host)
    _host = req.session.oauth2.host;

  // redirect_uri
  const redirectUri =
    (req.secure ? "https" : "http") + "://" + path.join(_host, uri);
  return redirectUri;
}

function callbackResult(req, res, authData) {
  if (
    typeof req.session === "object" &&
    req.session.oauth2 &&
    req.session.oauth2.callback
  ) {
    const { callback } = req.session.oauth2;
    const joint = callback.indexOf("?") > -1 ? "&" : "?";
    return res.redirect(callback + joint + qsStringify(authData));
  }
  return res.json(authData);
}

export default class SocialOAuth2 {
  /**
   * @param {Object?} api - Express router
   * @return {Object} express router
   */
  static create(options, api = Router()) {
    const router = new SocialOAuth2(options);

    // facebook
    api.get("/facebook/auth", (req, res) => router.facebookAuth(req, res));
    api.get("/facebook/callback", (req, res) =>
      router.facebookCallback(req, res)
    );
    api.post("/facebook/login", (req, res) => router.facebookLogin(req, res));

    // google
    api.get("/google/auth", (req, res) => router.googleAuth(req, res));
    api.get("/google/callback", (req, res) => router.googleCallback(req, res));
    api.post("/google/login", (req, res) => router.googleLogin(req, res));

    // instagram
    api.get("/instagram/auth", (req, res) => router.instagramAuth(req, res));
    api.get("/instagram/callback", (req, res) =>
      router.instagramCallback(req, res)
    );
    api.post("/instagram/login", (req, res) => router.instagramLogin(req, res));
    api.post("/instagram/link", (req, res) => router.instagramLink(req, res));
    api.get("/instagram/recent", (req, res) =>
      router.instagramRecent(req, res)
    );

    // naver
    api.get("/naver/auth", (req, res) => router.naverAuth(req, res));
    api.get("/naver/callback", (req, res) => router.naverCallback(req, res));
    api.post("/naver/login", (req, res) => router.naverLogin(req, res));

    // daum
    api.get("/daum/auth", (req, res) => router.daumAuth(req, res));
    api.get("/daum/callback", (req, res) => router.daumCallback(req, res));
    api.post("/daum/login", (req, res) => router.daumLogin(req, res));

    // kakao
    api.get("/kakao/auth", (req, res) => router.kakaoAuth(req, res));
    api.get("/kakao/callback", (req, res) => router.kakaoCallback(req, res));
    api.post("/kakao/login", (req, res) => router.kakaoLogin(req, res));

    return api;
  }

  constructor(options) {
    const _path = options.path;

    // facebook
    this.fbOAuth2 = fbOAuth2();
    this.fbRedirectUri = path.join(_path, "/facebook/callback");

    // google
    this.googleOAuth2 = googleOAuth2();
    this.googleRedirectUri = path.join(_path, "/google/callback");

    // instagram
    this.instaOAuth2 = instaOAuth2();
    this.instaRedirectUri = path.join(_path, "/instagram/callback");

    // naver
    this.naverOAuth2 = naverOAuth2();
    this.naverRedirectUri = path.join(_path, "/naver/callback");

    // daum
    this.daumOAuth2 = daumOAuth2();
    this.daumRedirectUri = path.join(_path, "/daum/callback");

    // kakao
    this.kakaoOAuth2 = kakaoOAuth2();
    this.kakaoRedirectUri = path.join(_path, "/kakao/callback");

    // userHandler
    const _userHandler = options.userHandler || defaultUserHandler;

    this.userHandler = (_req, user) => {
      return new Promise(resolve => {
        if (typeof _userHandler.then == "function") {
          _userHandler(_req, user).then(resolve);
        } else {
          setTimeout(() => resolve(_userHandler(_req, user)), 0);
        }
      });
    };
  }

  //
  // facebook
  //
  facebookAuth(req, res) {
    // For eg. "http://localhost:3000/facebook/callback"
    const params = {
      redirect_uri: makeRedirectUri(req, this.fbRedirectUri),
      scope: "email,public_profile"
    };
    console.log("params", params);
    return res.redirect(this.fbOAuth2.getAuthorizeUrl(params));
  }

  facebookCallback(req, res) {
    if (req.error_reason) {
      res.send(req.error_reason);
    }
    if (req.query && req.query.code) {
      // For eg. "/facebook/callback"
      this.fbOAuth2.getOAuthAccessToken(
        req.query.code,
        {
          grant_type: "authorization_code",
          redirect_uri: makeRedirectUri(req, this.fbRedirectUri)
        },
        (err, accessToken, refreshToken, params) => {
          if (err) {
            console.error(err);
            return res.send(err);
          }

          const facebookAuth = {
            access_token: accessToken,
            expiration_date: params.expires
          };
          // when custom callback
          return callbackResult(req, res, facebookAuth);
        }
      );
    }
  }

  /**
   * @param {String} accessToken
   * @return {Object} parse user
   */
  facebookLogin(req, res) {
    const { body = {}, session = {} } = req;
    console.log("body", body);
    console.log("session", session);
    const accessToken = body.access_token || session.access_token;
    const expires = body.expiration_date || session.expiration_date;
    if (!accessToken)
      return res
        .status(500)
        .json({ code: 101, error: "Invalid facebook access_token" })
        .end();

    function errorFn(err) {
      console.error(err);
      return res
        .status(500)
        .json(err)
        .end();
    }

    // https://developers.facebook.com/docs/graph-api/reference/v2.2/user
    this.fbOAuth2.get(
      "https://graph.facebook.com/me?fields=id,name,email",
      accessToken,
      (err, data /* , response */) => {
        if (err) {
          return errorFn(err);
        }

        const profile = JSON.parse(data);
        console.log(profile);
        const profileImageUrl =
          "https://graph.facebook.com/" + profile.id + "/picture";

        const authData = {
          facebook: {
            id: profile.id,
            access_token: accessToken,
            expiration_date: expires
          }
        };

        if (!profile.email)
          return errorFn({ code: 101, error: "Email is unknown" });

        const parseRest = new ParseRest(req);
        parseRest
          .get(
            "/users",
            { where: { username: profile.email } },
            { useMasterKey: true }
          )
          .then(users => {
            if (users && users[0]) {
              // Retrieving
              const user = users[0];
              // ban user
              if (user.isBanned)
                return errorFn({ code: 101, error: "User is banned" });
              // save param
              const _param = { socialType: "facebook", authData };
              parseRest
                .put("/users/" + user.objectId, _param, { useMasterKey: true })
                .then(() => {
                  // session query
                  parseRest
                    .get(
                      "/sessions",
                      {
                        where: {
                          user: {
                            __type: "Pointer",
                            className: "_User",
                            objectId: user.objectId
                          }
                        }
                      },
                      { useMasterKey: true }
                    )
                    .then(sessions => {
                      if (sessions && sessions[0]) {
                        const _session = sessions[0];
                        if (typeof req.session === "object")
                          req.session.sessionToken = _session.sessionToken;
                        // end
                        return this.userHandler(req, {
                          ...user,
                          ..._param,
                          sessionToken: _session.sessionToken
                        }).then(handledUser => res.json(handledUser));
                      }
                      // login
                      const password =
                        typeof profile.id === "number"
                          ? profile.id.toString()
                          : profile.id;
                      return parseRest
                        .put(
                          "/users/" + user.objectId,
                          { password },
                          { useMasterKey: true }
                        )
                        .then(() => {
                          return parseRest
                            .get("/login", {
                              username: profile.email,
                              password
                            })
                            .then(result => {
                              // reload
                              parseRest
                                .get("/users/me", null, {
                                  "X-Parse-Session-Token": result.sessionToken
                                })
                                .then(_user => {
                                  // end
                                  return this.userHandler(req, {
                                    ..._user,
                                    sessionToken: result.sessionToken
                                  }).then(handledUser => res.json(handledUser));
                                }, errorFn);
                            }, errorFn);
                        }, errorFn);
                    }, errorFn);
                }, errorFn);
            } else {
              // New
              const user = {
                username: profile.email,
                password:
                  typeof profile.id === "number"
                    ? profile.id.toString()
                    : profile.id,
                name: profile.name,
                email: profile.email,
                socialType: "facebook",
                socialProfile: profile,
                profileImage: { url: profileImageUrl },
                authData
              };
              parseRest
                .post("/users", user, { useMasterKey: true })
                .then(result => {
                  // reload
                  parseRest
                    .get("/users/me", null, {
                      "X-Parse-Session-Token": result.sessionToken
                    })
                    .then(_user => {
                      // end
                      return this.userHandler(req, {
                        ..._user,
                        sessionToken: result.sessionToken
                      }).then(handledUser => res.json(handledUser));
                    }, errorFn);
                }, errorFn);
            }
          }, errorFn);
      }
    );
  }

  //
  // google
  //
  googleAuth(req, res) {
    // For eg. "http://localhost:3000/google/callback"
    const params = {
      redirect_uri: makeRedirectUri(req, this.googleRedirectUri),
      scope: "email profile",
      response_type: "code"
    };
    console.log("params", params);
    return res.redirect(this.googleOAuth2.getAuthorizeUrl(params));
  }

  googleCallback(req, res) {
    if (req.error_reason) {
      res.send(req.error_reason);
    }
    if (req.query && req.query.code) {
      // For eg. "/google/callback"
      this.googleOAuth2.getOAuthAccessToken(
        req.query.code,
        {
          grant_type: "authorization_code",
          redirect_uri: makeRedirectUri(req, this.googleRedirectUri)
        },
        (err, accessToken, refreshToken, params) => {
          if (err) {
            console.error(err);
            return res.send(err);
          }

          const googleAuth = {
            access_token: accessToken,
            expiration_date: params.expires_in
          };
          // when custom callback
          return callbackResult(req, res, googleAuth);
        }
      );
    }
  }

  /**
   * @param {String} accessToken
   * @return {Object} parse user
   */
  googleLogin(req, res) {
    const { body = {}, session = {} } = req;
    console.log("body", body);
    console.log("session", session);
    const accessToken = body.access_token || session.access_token;
    const expires = body.expiration_date || session.expiration_date;
    if (!accessToken)
      return res
        .status(500)
        .json({ code: 101, error: "Invalid google access_token" })
        .end();

    function errorFn(err) {
      console.error(err);
      return res
        .status(500)
        .json(err)
        .end();
    }

    // https://developers.google.com/oauthplayground
    this.googleOAuth2.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      accessToken,
      (err, data /* , response */) => {
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

        if (!profile.email)
          return errorFn({ code: 101, error: "Email is unknown" });

        const parseRest = new ParseRest(req);
        parseRest
          .get(
            "/users",
            { where: { username: profile.email } },
            { useMasterKey: true }
          )
          .then(users => {
            if (users && users[0]) {
              // Retrieving
              const user = users[0];
              // ban user
              if (user.isBanned)
                return errorFn({ code: 101, error: "User is banned" });
              // save param
              const _param = { socialType: "google", authData };
              parseRest
                .put("/users/" + user.objectId, _param, { useMasterKey: true })
                .then(() => {
                  // session query
                  parseRest
                    .get(
                      "/sessions",
                      {
                        where: {
                          user: {
                            __type: "Pointer",
                            className: "_User",
                            objectId: user.objectId
                          }
                        }
                      },
                      { useMasterKey: true }
                    )
                    .then(sessions => {
                      if (sessions && sessions[0]) {
                        const _session = sessions[0];
                        if (typeof req.session === "object")
                          req.session.sessionToken = _session.sessionToken;
                        // end
                        return this.userHandler(req, {
                          ...user,
                          ..._param,
                          sessionToken: _session.sessionToken
                        }).then(handledUser => res.json(handledUser));
                      }
                      // login
                      const password =
                        typeof profile.id === "number"
                          ? profile.id.toString()
                          : profile.id;
                      return parseRest
                        .put(
                          "/users/" + user.objectId,
                          { password },
                          { useMasterKey: true }
                        )
                        .then(() => {
                          return parseRest
                            .get("/login", {
                              username: profile.email,
                              password
                            })
                            .then(result => {
                              // reload
                              parseRest
                                .get("/users/me", null, {
                                  "X-Parse-Session-Token": result.sessionToken
                                })
                                .then(_user => {
                                  // end
                                  return this.userHandler(req, {
                                    ..._user,
                                    sessionToken: result.sessionToken
                                  }).then(handledUser => res.json(handledUser));
                                }, errorFn);
                            }, errorFn);
                        }, errorFn);
                    }, errorFn);
                }, errorFn);
            } else {
              // New
              const user = {
                username: profile.email,
                password:
                  typeof profile.id === "number"
                    ? profile.id.toString()
                    : profile.id,
                name: profile.name,
                email: profile.email,
                socialType: "google",
                socialProfile: profile,
                profileImage: { url: profileImageUrl },
                authData
              };
              parseRest
                .post("/users", user, { useMasterKey: true })
                .then(result => {
                  // reload
                  parseRest
                    .get("/users/me", null, {
                      "X-Parse-Session-Token": result.sessionToken
                    })
                    .then(_user => {
                      // end
                      return this.userHandler(req, {
                        ..._user,
                        sessionToken: result.sessionToken
                      }).then(handledUser => res.json(handledUser));
                    }, errorFn);
                }, errorFn);
            }
          }, errorFn);
      }
    );
  }

  //
  // instagram
  //
  instagramAuth(req, res) {
    // For eg. "http://localhost:3000/instagram/callback"
    const params = {
      redirect_uri: makeRedirectUri(req, this.instaRedirectUri),
      scope: "basic public_content",
      response_type: "code"
    };
    console.log("params", params);
    return res.redirect(this.instaOAuth2.getAuthorizeUrl(params));
  }

  instagramCallback(req, res) {
    if (req.error_reason) {
      res.send(req.error_reason);
    }
    if (req.query && req.query.code) {
      // For eg. "/instagram/callback"
      this.instaOAuth2.getOAuthAccessToken(
        req.query.code,
        {
          grant_type: "authorization_code",
          redirect_uri: makeRedirectUri(req, this.instaRedirectUri)
        },
        (err, accessToken, refreshToken, params) => {
          if (err) {
            console.error(err);
            return res.send(err);
          }

          const instagramAuth = {
            access_token: accessToken,
            user: params.user
          };
          // when custom callback
          return callbackResult(req, res, instagramAuth);
        }
      );
    }
  }

  /**
   * @param {String} accessToken
   * @return {Object} parse user
   */
  instagramLogin(req, res) {
    const { body = {}, session = {} } = req;
    console.log("body", body);
    console.log("session", session);
    const accessToken = body.access_token || session.access_token;
    if (!accessToken)
      return res
        .status(500)
        .json({ code: 101, error: "Invalid instagram access_token" })
        .end();

    function errorFn(err) {
      console.error(err);
      return res
        .status(500)
        .json(err)
        .end();
    }

    // https://www.instagram.com/developer/endpoints/users/
    this.instaOAuth2.get(
      "https://api.instagram.com/v1/users/self/",
      accessToken,
      (err, data /* , response */) => {
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

        if (!profile.username)
          return errorFn({ code: 101, error: "Email is unknown" });

        const parseRest = new ParseRest(req);
        parseRest
          .get(
            "/users",
            { where: { username: profile.username } },
            { useMasterKey: true }
          )
          .then(users => {
            if (users && users[0]) {
              // Retrieving
              const user = users[0];
              // ban user
              if (user.isBanned)
                return errorFn({ code: 101, error: "User is banned" });
              // save param
              const _param = { socialType: "instagram", authData };
              parseRest
                .put("/users/" + user.objectId, _param, { useMasterKey: true })
                .then(() => {
                  // session query
                  parseRest
                    .get(
                      "/sessions",
                      {
                        where: {
                          user: {
                            __type: "Pointer",
                            className: "_User",
                            objectId: user.objectId
                          }
                        }
                      },
                      { useMasterKey: true }
                    )
                    .then(sessions => {
                      if (sessions && sessions[0]) {
                        const _session = sessions[0];
                        if (typeof req.session === "object")
                          req.session.sessionToken = _session.sessionToken;
                        // end
                        return this.userHandler(req, {
                          ...user,
                          ..._param,
                          sessionToken: _session.sessionToken
                        }).then(handledUser => res.json(handledUser));
                      }
                      // login
                      const password =
                        typeof profile.id === "number"
                          ? profile.id.toString()
                          : profile.id;
                      return parseRest
                        .put(
                          "/users/" + user.objectId,
                          { password },
                          { useMasterKey: true }
                        )
                        .then(() => {
                          return parseRest
                            .get("/login", {
                              username: profile.username,
                              password
                            })
                            .then(result => {
                              // reload
                              parseRest
                                .get("/users/me", null, {
                                  "X-Parse-Session-Token": result.sessionToken
                                })
                                .then(_user => {
                                  // end
                                  return this.userHandler(req, {
                                    ..._user,
                                    sessionToken: result.sessionToken
                                  }).then(handledUser => res.json(handledUser));
                                }, errorFn);
                            }, errorFn);
                        }, errorFn);
                    }, errorFn);
                }, errorFn);
            } else {
              // New
              const user = {
                username: profile.username,
                password:
                  typeof profile.id === "number"
                    ? profile.id.toString()
                    : profile.id,
                name: profile.full_name,
                // email: profile.email,
                socialType: "instagram",
                socialProfile: profile,
                profileImage: { url: profile.profile_picture },
                authData
              };
              parseRest
                .post("/users", user, { useMasterKey: true })
                .then(result => {
                  // reload
                  parseRest
                    .get("/users/me", null, {
                      "X-Parse-Session-Token": result.sessionToken
                    })
                    .then(_user => {
                      // end
                      return this.userHandler(req, {
                        ..._user,
                        sessionToken: result.sessionToken
                      }).then(handledUser => res.json(handledUser));
                    }, errorFn);
                }, errorFn);
            }
          }, errorFn);
      }
    );
  }

  /**
   * @param {String} accessToken
   * @return {Object} parse user
   */
  instagramLink(req, res) {
    const { body = {}, session = {} } = req;
    console.log("body", body);
    console.log("session", session);
    const accessToken = body.access_token || session.access_token;
    const userId = body.userId || (session.user && session.user.objectId);
    const username = body.username || (session.user && session.user.username);
    if (!accessToken)
      return res
        .status(500)
        .json({ code: 101, error: "Invalid instagram access_token" })
        .end();
    if (!userId && !username)
      return res
        .status(500)
        .json({ code: 102, error: "Invalid parameter : userId or username" })
        .end();

    function errorFn(err) {
      console.error(err);
      return res
        .status(500)
        .json(err)
        .end();
    }

    this.instaOAuth2.get(
      "https://api.instagram.com/v1/users/self/",
      accessToken,
      (err, data /* , response */) => {
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
          parseRest
            .get("/users", { where: _where }, { useMasterKey: true })
            .then(users => {
              if (users && users[0]) {
                // Retrieving
                const user = users[0];
                // authData save
                const newAuthData = { ...user.authData, ...authData };
                return parseRest
                  .put(
                    "/users/" + user.objectId,
                    { authData: newAuthData },
                    { useMasterKey: true }
                  )
                  .then(() => {
                    // keep
                    user.authData = newAuthData;
                    // session query
                    parseRest
                      .get(
                        "/sessions",
                        {
                          where: {
                            user: {
                              __type: "Pointer",
                              className: "_User",
                              objectId: user.objectId
                            }
                          }
                        },
                        { useMasterKey: true }
                      )
                      .then(sessions => {
                        if (sessions && sessions[0]) {
                          const _session = sessions[0];
                          if (typeof req.session === "object")
                            req.session.sessionToken = _session.sessionToken;
                          // end
                          return this.userHandler(req, {
                            ...user,
                            ..._param,
                            sessionToken: _session.sessionToken
                          }).then(handledUser => res.json(handledUser));
                        }
                        // login
                        const password =
                          typeof profile.id === "number"
                            ? profile.id.toString()
                            : profile.id;
                        return parseRest
                          .put(
                            "/users/" + user.objectId,
                            { password },
                            { useMasterKey: true }
                          )
                          .then(() => {
                            return parseRest
                              .get("/login", {
                                username,
                                password
                              })
                              .then(result => {
                                // reload
                                parseRest
                                  .get("/users/me", null, {
                                    "X-Parse-Session-Token": result.sessionToken
                                  })
                                  .then(_user => {
                                    // end
                                    return this.userHandler(req, {
                                      ..._user,
                                      sessionToken: result.sessionToken
                                    }).then(handledUser =>
                                      res.json(handledUser)
                                    );
                                  }, errorFn);
                              }, errorFn);
                          }, errorFn);
                      }, errorFn);
                  }, errorFn);
              }
              return errorFn({ code: 101, error: "user not exist" });
            }, errorFn);
        }
      }
    );
  }

  /**
   * @param {String} userId
   * @return {Array} instagram recent media
   */
  instagramRecent(req, res) {
    const { query = {}, session = {} } = req;
    console.log("query", query);
    console.log("session", session);
    const userId = query.userId || (session.user && session.user.objectId);
    if (!userId)
      return res
        .status(500)
        .json({ code: 102, error: "Invalid parameter : userId" })
        .end();

    function errorFn(err) {
      console.error(err);
      return res
        .status(500)
        .json(err)
        .end();
    }

    const parseRest = new ParseRest(req);
    parseRest
      .get("/users", { where: { objectId: userId } }, { useMasterKey: true })
      .then(users => {
        if (users && users[0]) {
          // Retrieving
          const user = users[0];
          // get instagram authData
          const accessToken =
            user.authData &&
            user.authData.instagram &&
            user.authData.instagram.access_token;
          if (!accessToken)
            return errorFn({
              code: 101,
              error: "Invalid instagram access_token"
            });

          // get recent
          return this.instaOAuth2.get(
            "https://api.instagram.com/v1/users/self/media/recent/",
            accessToken,
            (err, data /* , response */) => {
              if (err) {
                return errorFn(err);
              }

              const recent = JSON.parse(data).data;
              // end
              return res.json(recent);
            }
          );
        }
        return errorFn("user not exist");
      });
  }

  //
  // naver
  //
  naverAuth(req, res) {
    // For eg. "http://localhost:3000/naver/callback"
    const params = {
      redirect_uri: makeRedirectUri(req, this.naverRedirectUri),
      response_type: "code"
    };
    console.log("params", params);
    return res.redirect(this.naverOAuth2.getAuthorizeUrl(params));
  }

  naverCallback(req, res) {
    if (req.error_reason) {
      res.send(req.error_reason);
    }
    if (req.query && req.query.code) {
      // For eg. "/naver/callback"
      this.naverOAuth2.getOAuthAccessToken(
        req.query.code,
        {
          grant_type: "authorization_code",
          redirect_uri: makeRedirectUri(req, this.naverRedirectUri)
        },
        (err, accessToken, refreshToken, params) => {
          if (err) {
            console.error(err);
            return res.send(err);
          }

          const naverAuth = {
            access_token: accessToken,
            expiration_date: params.expires_in
          };
          // when custom callback
          return callbackResult(req, res, naverAuth);
        }
      );
    }
  }

  /**
   * @param {String} accessToken
   * @return {Object} parse user
   */
  naverLogin(req, res) {
    const { body = {}, session = {} } = req;
    console.log("body", body);
    console.log("session", session);
    const accessToken = body.access_token || session.access_token;
    const expires = body.expiration_date || session.expiration_date;
    if (!accessToken)
      return res
        .status(500)
        .json({ code: 101, error: "Invalid naver access_token" })
        .end();

    function errorFn(err) {
      console.error(err);
      return res
        .status(500)
        .json(err)
        .end();
    }

    // https://developers.naver.com/docs/login/profile/
    this.naverOAuth2.get("https://openapi.naver.com/v1/nid/me", accessToken, (
      err,
      data /* , response */
    ) => {
      if (err) {
        return errorFn(err);
      }

      const profile = JSON.parse(data).response;
      console.log(profile);

      const authDataEtc = {
        naver: {
          id: profile.id,
          access_token: accessToken,
          expiration_date: expires
        }
      };

      if (!profile.email)
        return errorFn({ code: 101, error: "Email is unknown" });

      const parseRest = new ParseRest(req);
      parseRest
        .get(
          "/users",
          { where: { username: profile.email } },
          { useMasterKey: true }
        )
        .then(users => {
          if (users && users[0]) {
            // Retrieving
            const user = users[0];
            // ban user
            if (user.isBanned)
              return errorFn({ code: 101, error: "User is banned" });
            // save param
            const _param = { socialType: "naver", authDataEtc };
            parseRest
              .put("/users/" + user.objectId, _param, { useMasterKey: true })
              .then(() => {
                // session query
                parseRest
                  .get(
                    "/sessions",
                    {
                      where: {
                        user: {
                          __type: "Pointer",
                          className: "_User",
                          objectId: user.objectId
                        }
                      }
                    },
                    { useMasterKey: true }
                  )
                  .then(sessions => {
                    if (sessions && sessions[0]) {
                      const _session = sessions[0];
                      if (typeof req.session === "object")
                        req.session.sessionToken = _session.sessionToken;
                      // end
                      return this.userHandler(req, {
                        ...user,
                        ..._param,
                        sessionToken: _session.sessionToken
                      }).then(handledUser => res.json(handledUser));
                    }
                    // login
                    const password =
                      typeof profile.id === "number"
                        ? profile.id.toString()
                        : profile.id;
                    return parseRest
                      .put(
                        "/users/" + user.objectId,
                        { password },
                        { useMasterKey: true }
                      )
                      .then(() => {
                        return parseRest
                          .get("/login", {
                            username: profile.email,
                            password
                          })
                          .then(result => {
                            // reload
                            parseRest
                              .get("/users/me", null, {
                                "X-Parse-Session-Token": result.sessionToken
                              })
                              .then(_user => {
                                // end
                                return this.userHandler(req, {
                                  ..._user,
                                  sessionToken: result.sessionToken
                                }).then(handledUser => res.json(handledUser));
                              }, errorFn);
                          }, errorFn);
                      }, errorFn);
                  }, errorFn);
              }, errorFn);
          } else {
            // New
            const user = {
              username: profile.email,
              password:
                typeof profile.id === "number"
                  ? profile.id.toString()
                  : profile.id,
              name: profile.name,
              email: profile.email,
              socialType: "naver",
              socialProfile: profile,
              profileImage: { url: profile.profile_image },
              authDataEtc
            };
            parseRest
              .post("/users", user, { useMasterKey: true })
              .then(result => {
                // reload
                parseRest
                  .get("/users/me", null, {
                    "X-Parse-Session-Token": result.sessionToken
                  })
                  .then(_user => {
                    // end
                    return this.userHandler(req, {
                      ..._user,
                      sessionToken: result.sessionToken
                    }).then(handledUser => res.json(handledUser));
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
    const params = {
      redirect_uri: makeRedirectUri(req, this.daumRedirectUri),
      response_type: "code"
    };
    console.log("params", params);
    return res.redirect(this.daumOAuth2.getAuthorizeUrl(params));
  }

  daumCallback(req, res) {
    if (req.error_reason) {
      res.send(req.error_reason);
    }
    if (req.query && req.query.code) {
      // For eg. "/daum/callback"
      this.daumOAuth2.getOAuthAccessToken(
        req.query.code,
        {
          grant_type: "authorization_code",
          redirect_uri: makeRedirectUri(req, this.daumRedirectUri)
        },
        (err, accessToken, refreshToken, params) => {
          if (err) {
            console.error(err);
            return res.send(err);
          }

          const daumAuth = {
            access_token: accessToken,
            expiration_date: params.expires_in
          };
          // when custom callback
          return callbackResult(req, res, daumAuth);
        }
      );
    }
  }

  /**
   * @param {String} accessToken
   * @return {Object} parse user
   */
  daumLogin(req, res) {
    const { body = {}, session = {} } = req;
    console.log("body", body);
    console.log("session", session);
    const accessToken = body.access_token || session.access_token;
    const expires = body.expiration_date || session.expiration_date;
    if (!accessToken)
      return res
        .status(500)
        .json({ code: 101, error: "Invalid daum access_token" })
        .end();

    function errorFn(err) {
      console.error(err);
      return res
        .status(500)
        .json(err)
        .end();
    }

    // https://developers.daum.net/services/apis/user/v1/show.format
    this.daumOAuth2.get(
      "https://apis.daum.net/user/v1/show.json",
      accessToken,
      (err, data /* , response */) => {
        if (err) {
          return errorFn(err);
        }

        const profile = JSON.parse(data).result;
        console.log(profile);

        const authDataEtc = {
          daum: {
            id: profile.id,
            access_token: accessToken,
            expiration_date: expires
          }
        };

        if (!profile.userid)
          return errorFn({ code: 101, error: "Email is unknown" });

        if (req.headers) req.headers.sessionToken = null;
        if (req.session) req.session.sessionToken = null;
        const parseRest = new ParseRest(req);
        parseRest
          .get(
            "/users",
            { where: { username: profile.userid } },
            { useMasterKey: true }
          )
          .then(users => {
            if (users && users[0]) {
              // Retrieving
              const user = users[0];
              // ban user
              if (user.isBanned)
                return errorFn({ code: 101, error: "User is banned" });
              // save param
              const _param = { socialType: "daum", authDataEtc };
              parseRest
                .put("/users/" + user.objectId, _param, { useMasterKey: true })
                .then(() => {
                  // session query
                  parseRest
                    .get(
                      "/sessions",
                      {
                        where: {
                          user: {
                            __type: "Pointer",
                            className: "_User",
                            objectId: user.objectId
                          }
                        }
                      },
                      { useMasterKey: true }
                    )
                    .then(sessions => {
                      if (sessions && sessions[0]) {
                        const _session = sessions[0];
                        if (typeof req.session === "object")
                          req.session.sessionToken = _session.sessionToken;
                        // end
                        return this.userHandler(req, {
                          ...user,
                          ..._param,
                          sessionToken: _session.sessionToken
                        }).then(handledUser => res.json(handledUser));
                      }
                      // login
                      const password =
                        typeof profile.id === "number"
                          ? profile.id.toString()
                          : profile.id;
                      return parseRest
                        .put(
                          "/users/" + user.objectId,
                          { password },
                          { useMasterKey: true }
                        )
                        .then(() => {
                          return parseRest
                            .get("/login", {
                              username: profile.userid,
                              password
                            })
                            .then(result => {
                              // reload
                              parseRest
                                .get("/users/me", null, {
                                  "X-Parse-Session-Token": result.sessionToken
                                })
                                .then(_user => {
                                  // end
                                  return this.userHandler(req, {
                                    ..._user,
                                    sessionToken: result.sessionToken
                                  }).then(handledUser => res.json(handledUser));
                                }, errorFn);
                            }, errorFn);
                        }, errorFn);
                    }, errorFn);
                }, errorFn);
            } else {
              // New
              const user = {
                username: profile.userid,
                password:
                  typeof profile.id === "number"
                    ? profile.id.toString()
                    : profile.id,
                name: profile.nickname,
                // email: profile.email,
                socialType: "daum",
                socialProfile: profile,
                profileImage: { url: profile.imagePath },
                authDataEtc
              };
              parseRest
                .post("/users", user, { useMasterKey: true })
                .then(result => {
                  // reload
                  parseRest
                    .get("/users/me", null, {
                      "X-Parse-Session-Token": result.sessionToken
                    })
                    .then(_user => {
                      // end
                      return this.userHandler(req, {
                        ..._user,
                        sessionToken: result.sessionToken
                      }).then(handledUser => res.json(handledUser));
                    }, errorFn);
                }, errorFn);
            }
          }, errorFn);
      }
    );
  }

  //
  // kakao
  //
  kakaoAuth(req, res) {
    // For eg. "http://localhost:3000/kakao/callback"
    const params = {
      redirect_uri: makeRedirectUri(req, this.kakaoRedirectUri),
      response_type: "code"
    };
    console.log("params", params);
    return res.redirect(this.kakaoOAuth2.getAuthorizeUrl(params));
  }

  kakaoCallback(req, res) {
    if (req.error_reason) {
      res.send(req.error_reason);
    }
    if (req.query && req.query.code) {
      // For eg. "/kakao/callback"
      this.kakaoOAuth2.getOAuthAccessToken(
        req.query.code,
        {
          grant_type: "authorization_code",
          redirect_uri: makeRedirectUri(req, this.kakaoRedirectUri)
        },
        (err, accessToken, refreshToken, params) => {
          if (err) {
            console.error(err);
            return res.send(err);
          }

          const kakaoAuth = {
            access_token: accessToken,
            expiration_date: params.expires_in
          };
          // when custom callback
          return callbackResult(req, res, kakaoAuth);
        }
      );
    }
  }

  /**
   * @param {String} accessToken
   * @return {Object} parse user
   */
  kakaoLogin(req, res) {
    const { body = {}, session = {} } = req;
    console.log("body", body);
    console.log("session", session);
    const accessToken = body.access_token || session.access_token;
    const expires = body.expiration_date || session.expiration_date;
    if (!accessToken)
      return res
        .status(500)
        .json({ code: 101, error: "Invalid kakao access_token" })
        .end();

    function errorFn(err) {
      console.error(err);
      return res
        .status(500)
        .json(err)
        .end();
    }

    // https://developers.kakao.com/docs/restapi/user-management#%EB%A1%9C%EA%B7%B8%EC%9D%B8
    this.kakaoOAuth2.get("https://kapi.kakao.com/v1/user/me", accessToken, (
      err,
      data /* , response */
    ) => {
      if (err) {
        return errorFn(err);
      }

      const profile = JSON.parse(data);
      console.log(profile);

      const authDataEtc = {
        kakao: {
          id: profile.id,
          access_token: accessToken,
          expiration_date: expires
        }
      };

      if (!profile.kaccount_email && !profile.id)
        return errorFn({ code: 101, error: "Email is unknown" });

      if (req.headers) req.headers.sessionToken = null;
      if (req.session) req.session.sessionToken = null;
      const parseRest = new ParseRest(req);
      parseRest
        .get(
          "/users",
          { where: { username: profile.kaccount_email || profile.id } },
          { useMasterKey: true }
        )
        .then(users => {
          if (users && users[0]) {
            // Retrieving
            const user = users[0];
            // ban user
            if (user.isBanned)
              return errorFn({ code: 101, error: "User is banned" });
            // save param
            const _param = { socialType: "kakao", authDataEtc };
            parseRest
              .put("/users/" + user.objectId, _param, { useMasterKey: true })
              .then(() => {
                // session query
                parseRest
                  .get(
                    "/sessions",
                    {
                      where: {
                        user: {
                          __type: "Pointer",
                          className: "_User",
                          objectId: user.objectId
                        }
                      }
                    },
                    { useMasterKey: true }
                  )
                  .then(sessions => {
                    if (sessions && sessions[0]) {
                      const _session = sessions[0];
                      if (typeof req.session === "object")
                        req.session.sessionToken = _session.sessionToken;
                      // end
                      return this.userHandler(req, {
                        ...user,
                        ..._param,
                        sessionToken: _session.sessionToken
                      }).then(handledUser => res.json(handledUser));
                    }
                    // login
                    const password =
                      typeof profile.id === "number"
                        ? profile.id.toString()
                        : profile.id;
                    return parseRest
                      .put(
                        "/users/" + user.objectId,
                        { password },
                        { useMasterKey: true }
                      )
                      .then(() => {
                        return parseRest
                          .get("/login", {
                            username: profile.kaccount_email || profile.id,
                            password
                          })
                          .then(result => {
                            // reload
                            parseRest
                              .get("/users/me", null, {
                                "X-Parse-Session-Token": result.sessionToken
                              })
                              .then(_user => {
                                // end
                                return this.userHandler(req, {
                                  ..._user,
                                  sessionToken: result.sessionToken
                                }).then(handledUser => res.json(handledUser));
                              }, errorFn);
                          }, errorFn);
                      }, errorFn);
                  }, errorFn);
              }, errorFn);
          } else {
            // New
            const user = {
              username: profile.kaccount_email || profile.id,
              password:
                typeof profile.id === "number"
                  ? profile.id.toString()
                  : profile.id,
              name: profile.properties.nickname,
              // email: profile.email,
              socialType: "kakao",
              socialProfile: profile,
              profileImage: { url: profile.properties.profile_image },
              authDataEtc
            };
            parseRest
              .post("/users", user, { useMasterKey: true })
              .then(result => {
                // reload
                parseRest
                  .get("/users/me", null, {
                    "X-Parse-Session-Token": result.sessionToken
                  })
                  .then(_user => {
                    // end
                    return this.userHandler(req, {
                      ..._user,
                      sessionToken: result.sessionToken
                    }).then(handledUser => res.json(handledUser));
                  }, errorFn);
              }, errorFn);
          }
        }, errorFn);
    });
  }
}
