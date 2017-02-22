Parse OAuth2 SNS
================

[![npm version](https://badge.fury.io/js/parse-oauth2-sns.svg)](https://badge.fury.io/js/parse-oauth2-sns)

Install
-------

```
npm install --save parse-oauth2-sns
```

How to Use
----------

### Facebook Routes

* /facebook/auth

  * request [get]

  * response : redirect to Facebook OAuth page

* /facebook/callback

  * request [get]

  * response : json

  ```javascript
 {"access_token":"...","expiration_date":"..."}
  ```

* /facebook/login

  * request [post] : json (facebook auth info)

  ```javascript
 {"access_token":"...","expiration_date":"..."}
  ```

  * response : parse user object (username equal to facebook email)

  ```javascript
 {"objectId": "ziJdB2jBul", "username": "__facebook.email__", authData, ...}
  ```

### Instagram Routes

* /instagram/auth

  * request [get]

  * response : redirect to Instagram OAuth page

* /instagram/callback

  * request [get]

  * response : json

  ```javascript
 {"access_token":"...","user":"..."}
  ```

* /instagram/link : parse user link to instagram user.

  * request [post] : instagram token and parse user info.

  ```javascript
  {"access_token":"", "username": "__parse user.username__"}
  ```

  * response : parse user object linked instagram

  ```javascript  
  {"objectId": "ziJdB2jBul", "username": "__facebook.email__", authData, ...}
  ```

* /instagram/recent : get recent post from instagram

  * request [get] : userId (parse user.objectId)

  * response : instagram posts

  ```javascript  
  [{images, caption, comments, ...}, ...]
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
process.env.FB_APPIDS = ["__fb_key__"];
process.env.FB_SECRETS = ["__fb_secret__"];
process.env.INSTA_APPIDS = ["__insta_key__"];
process.env.INSTA_SECRETS = ["__insta_secret__"];
```

### Router using Express

* load module

```javascript
// es6
import SocialOAuth2 from 'parse-oauth2-sns';
```

```javascript
// es5
var SocialOAuth2 = require('parse-oauth2-sns').default;
```

* create object

```javascript
// OAuth2
app.use('/oauth2', SocialOAuth2.create({ path: '/oauth2' }));
```

```javascript
// OR OAuth2 + userObject Handler
app.use('/oauth2', SocialOAuth2.create({ path: '/oauth2', userHandler: function(req, user) { ...  return user; } }));
```
