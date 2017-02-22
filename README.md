Parse OAuth2 SNS
================

[![npm version](https://badge.fury.io/js/parse-oauth2-sns.svg)](https://badge.fury.io/js/parse-oauth2-sns)

> Node.JS & Express module for
> social (Facebook, Instagram) auth and login to [parse-server](https://github.com/ParsePlatform/parse-server).
> Plus, Korean SNS supports (Naver, Daum)

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

  * response : parse-serve user object (username equal to facebook email)

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

  * request [get]

  * response : redirect to naver OAuth page

* /naver/callback

  * request [get]

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

  * request [get]

  * response : redirect to daum OAuth page

* /daum/callback

  * request [get]

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

Addon Features
--------------

### User

* user block/ban

  * if user.isBanned value is setted, user can't login.
