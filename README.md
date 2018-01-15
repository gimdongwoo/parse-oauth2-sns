Parse OAuth2 SNS (Social Media)
================

[![npm version](https://badge.fury.io/js/parse-oauth2-sns.svg)](https://badge.fury.io/js/parse-oauth2-sns)

> Node.JS & Express module for
> social media (Facebook, Google, Instagram) auth and login to [parse-server](https://github.com/ParsePlatform/parse-server).
> Plus, Korean SNS (Social Media) supports (Naver, Daum, Kakao)

Install
-------

```
npm install --save parse-oauth2-sns
```
np
How to Use
----------

### For Application

1. Use internal browser (like Android Webview)

2. Open auth url : /facebook/auth

  ```javascript
  http://__your_host__/oauth2/facebook/auth
  ```

3. Check url changed to '/callback'

4. Then url chenged to '/callback', get authdata from body.

  ```javascript
  // URL : facebook/callback
  {"access_token":"...","expiration_date":"..."}
  ```

### For Web

1. Open auth url with URL in callback parameter : /facebook/auth?callback=URL

  ```javascript
  window.location.href = 'http://__your_host__/oauth2/facebook/auth?callback=' + encodeURIComponent('/loginCallback?type=facebook')
  ```
  | Params | Type | Description |
  |--------|------|:------------|
  | callback | string | callback url. Redirected after authentication
  | host | string | If using proxy, can change api url host. ex) host=__your_host__/api

2. Then URL is called, get authdata from querystring.

  ```javascript
  http://__host__/loginCallback?type=facebook&access_token=...& expiration_date=...
  ```


Routes
------

### Facebook Routes

* /facebook/auth

  * request [get] : callback (url, option), host (url, option)

  * response : redirect to Facebook OAuth page

* /facebook/callback

  * request : from facebook OAuth page

  * response : json

  ```javascript
  {"access_token":"...","expiration_date":"..."}
  ```

* /facebook/login

  * request [post] : json (facebook auth info)

  ```javascript
  {"access_token":"...","expiration_date":"..."}
  ```

  * response : parse-serve user object (username equal to facebook email)

  ```javascript
  {"objectId": "ziJdB2jBul", "username": "__facebook.email__", authData, ...}
  ```

### Google Routes

* /google/auth

  * request [get] : callback (url, option), host (url, option)

  * response : redirect to Google OAuth page

* /google/callback

  * request : from google OAuth page

  * response : json

  ```javascript
  {"access_token":"...","expiration_date":"..."}
  ```

* /google/login

  * request [post] : json (google auth info)

  ```javascript
  {"access_token":"...","expiration_date":"..."}
  ```

  * response : parse-serve user object (username equal to google email)

  ```javascript
  {"objectId": "ziJdB2jBul", "username": "__google.email__", authData, ...}
  ```

### Instagram Routes

* /instagram/auth

  * request [get] : callback (url, option), host (url, option)

  * response : redirect to Instagram OAuth page

* /instagram/callback

  * request : from instagram OAuth page

  * response : json

  ```javascript
  {"access_token":"...","user":"..."}
  ```

* /instagram/login

  * request [post] : json (instagram auth info)

  ```javascript
  {"access_token":"..."}
  ```

  * response : parse-server user object (username equal to instagram username)

  ```javascript
  {"objectId": "ziJdB2jBul", "username": "__instagram.username__", authData, ...}
  ```

* /instagram/link : parse-server user link to instagram user.

  * request [post] : instagram token and parse-server user info.

  ```javascript
  {"access_token":"", "username": "__parse-server user.username__"}
  ```

  * response : parse-server user object linked instagram

  ```javascript  
  {"objectId": "ziJdB2jBul", "username": "__username__", authData, ...}
  ```

* /instagram/recent : get recent post from instagram

  * request [get] : userId (parse-server user.objectId)

  * response : instagram posts

  ```javascript  
  [{images, caption, comments, ...}, ...]
  ```

### Naver Routes

* /naver/auth

  * request [get] : callback (url, option), host (url, option)

  * response : redirect to naver OAuth page

* /naver/callback

  * request : from naver OAuth page

  * response : json

  ```javascript
  {"access_token":"...","expiration_date":"..."}
  ```

* /naver/login

  * request [post] : json (naver auth info)

  ```javascript
  {"access_token":"...","expiration_date":"..."}
  ```

  * response : parse-serve user object (username equal to naver email)

  ```javascript
  {"objectId": "ziJdB2jBul", "username": "__naver.email__", authData, ...}
  ```

### Daum Routes

* /daum/auth

  * request [get] : callback (url, option), host (url, option)

  * response : redirect to daum OAuth page

* /daum/callback

  * request : from daum OAuth page

  * response : json

  ```javascript
  {"access_token":"...","expiration_date":"..."}
  ```

* /daum/login

  * request [post] : json (daum auth info)

  ```javascript
  {"access_token":"...","expiration_date":"..."}
  ```

  * response : parse-server user object (username equal to daum userid, not email provided)

  ```javascript
  {"objectId": "ziJdB2jBul", "username": "__daum.userid__", authData, ...}
  ```

### Kako Routes

* /kakao/auth

  * request [get] : callback (url, option), host (url, option)

  * response : redirect to kakao OAuth page

* /kakao/callback

  * request : from kakao OAuth page

  * response : json

  ```javascript
  {"access_token":"...","expiration_date":"..."}
  ```

* /kakao/login

  * request [post] : json (kakao auth info)

  ```javascript
  {"access_token":"...","expiration_date":"..."}
  ```

  * response : parse-server user object (username equal to kakao email or kakao userid)

  ```javascript
  {"objectId": "ziJdB2jBul", "username": "__kakao.(kaccount_email||id)__", authData, ...}
  ```

Initialize
----------

### Setup up process.env

* It's work with [parse-rest-nodejs](https://github.com/gimdongwoo/parse-oauth2-sns).

  ```javascript
  // Recommend to use 'better-npm-run'.
  process.env.SERVER_URL = "http://__host__:__port__/parse"
  process.env.APP_ID = "__app_id__";
  process.env.MASTER_KEY = "__master_key__";
  process.env.FB_APPIDS = "__fb_key__";
  process.env.FB_SECRETS = "__fb_secret__";
  process.env.GOOGLE_APPIDS = "__google_key__";
  process.env.GOOGLE_SECRETS = "__goole_secret__";
  process.env.INSTA_APPIDS = "__insta_key__";
  process.env.INSTA_SECRETS = "__insta_secret__";
  process.env.NAVER_APPIDS = "__naver_key__";
  process.env.NAVER_SECRETS = "__naver_secret__";
  process.env.DAUM_APPIDS = "__daum_key__";
  process.env.DAUM_SECRETS = "__daum_secret__";
  process.env.KAKAO_RESTKEY = "__kakao_restkey__";
  process.env.KAKAO_SECRETS = "__kakao_secret__";
  ```

### Router using Express

* load module

  ```javascript
  // es6
  import SocialOAuth2 from 'parse-oauth2-sns';
  import bodyParser from 'body-parser';
  ```

  ```javascript
  // es5
  var SocialOAuth2 = require('parse-oauth2-sns').default;
  var bodyParser = require('body-parser');
  ```

* create object

  ```javascript
  // for use req.body
  app.use(bodyParser.json());

  // OAuth2
  app.use('/oauth2', SocialOAuth2.create({ path: '/oauth2' }));
  ```

  ```javascript
  // for use req.body
  app.use(bodyParser.json());

  // OR OAuth2 + userObject Handler
  app.use('/oauth2', SocialOAuth2.create({ path: '/oauth2', userHandler: function(req, user) { ...  return user; } }));
  ```

* Full code is in [test.js](https://github.com/gimdongwoo/parse-oauth2-sns/blob/master/test.js)

Addon Features
--------------

### User

* user block/ban

  * if user.isBanned value is setted, user can't login.
