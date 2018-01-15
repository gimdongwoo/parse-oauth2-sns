var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var http = require('http');
var ParseServer = require('parse-server').ParseServer;

var SocialOAuth2 = require('./lib/index').default;

// configuration
var port = 3030;
process.env.SERVER_URL = 'http://localhost:' + port + '/parse';
process.env.APP_ID = "Y58uDAh9445hEaGtwaJ3GnAMI10Bpk3b";
process.env.MASTER_KEY = "jt9gh7frZ32Y5Q698RP87F55R41pPdx1";
process.env.FB_APPIDS = ["1360181184056097"];
process.env.FB_SECRETS = ["cc50007848c429374e89bd2c5202e404"];
process.env.GOOGLE_APPIDS = ["163894218564-8gskurdh9gkm1ba1a5rm5n922rdung80.apps.googleusercontent.com"];
process.env.GOOGLE_SECRETS = ["e4EYIMUxxVH5Gr7DY55libeR"];
process.env.INSTA_APPIDS = ["6b5bf7aef2eb4296961fe43af1858a3c"];
process.env.INSTA_SECRETS = ["dbbc1c52f4da47c6a86f2f081e82598c"];
process.env.NAVER_APPIDS = ["Uyjq1a8Vz0nngCdlMZZw"];
process.env.NAVER_SECRETS = ["_Xigkgo0SD"];
process.env.DAUM_APPIDS = ["6600734411403537733"];
process.env.DAUM_SECRETS = ["d5bfe986d88f43932736deb6a4aa1e09"];
process.env.KAKAO_RESTKEY = ["ba78f36569c3c34fc8af6aa324ddb499"];
process.env.KAKAO_SECRETS = ["1XyhYj0GXcY1nT0zlyTFQ3E16RLmpaet"];

// app
var app = express();

// parse-server
var api = new ParseServer({
  databaseURI: 'mongodb://localhost/test',
  appId: process.env.APP_ID,
  masterKey: process.env.MASTER_KEY,
  serverURL: process.env.SERVER_URL,
  auth: {
    facebook: {
      appIds: process.env.FB_APPIDS
    }
  }
});

// Serve the MiddleWare(Parse) on the /parse URL prefix
app.use('/parse', api);

var server = new http.Server(app);

app.use(session({
  secret: 'parse-oauth2-sns',
  resave: false,
  saveUninitialized: false,
  // cookie: { maxAge: 60000 }
}));
app.use(bodyParser.json());

// OAuth2
app.use('/oauth2', SocialOAuth2.create({ path: '/oauth2' }));

// default
app.use((req, res) => {
  res.status(404).json({ code: 101, error: 'api not found' }).end();
});

// run server
var runnable = app.listen(port, (err) => {
  if (err) {
    console.error(err);
  }
  console.info('----\n==> 🌎  API is running on port %s', port);
  console.info('==> 💻  Send requests to http://%s:%s', 'localhost', port);
});

process.on('SIGINT', function() {
  console.log('SIGINT');
  process.exit();
});
