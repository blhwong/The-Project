const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const model = require('./model');
const db = require('./dbHelpers');
const connection = require('./db-mysql');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const KEYS = process.env.fbKey;
const fileUpload = require('express-fileupload');
const config = require('./config/config');

const app = express();
const cloudinary = require('cloudinary');
cloudinary.config({
  cloud_name: 'dsl0njnpb',
  api_key: '699437861478522',
  api_secret: 'jLZRElTaxWs30ckTcPwwGQ_rFCU'
});

const path = require('path');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
//Google cloud vision setup:
const gVision = require('./api/vision.js');
var localStorage = {};

const Mailgun = require('mailgun-js');

app.use( bodyParser.json() );
app.use(cors());
app.use(express.static(__dirname + '/../public/dist'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(fileUpload());

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
if (process.env.NODE_ENV === 'production') {
  app.use(require('express-session')({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true
  }));
} else {
  app.use(require('express-session')({
    secret: config.SESSION_SECRET,
    resave: true,
    saveUninitialized: true
  }));
}



// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

if (process.env.NODE_ENV === 'production') {
  passport.use(new FacebookStrategy({
    clientID: process.env.FB_CLIENT_ID,
    clientSecret: process.env.FB_CLIENT_SECRET,
    callbackURL: '/auth/facebook/callback',
    profileFields: ['id', 'email', 'displayName', 'gender', 'link', 'locale', 'name', 'timezone', 'updated_time', 'verified'],
  },

    function(accessToken, refreshToken, profile, cb) {
      process.nextTick(function () {
        let userInfo = {
          name: profile._json.name,
          fb_id: profile._json.id,
          token: accessToken,
          email: profile._json.email
        };
        db.createNewUser(userInfo);
        return cb(null, userInfo);
      });
    }
  ));

} else {
  const facebook = require('./config/facebook');
  passport.use(new FacebookStrategy({
    clientID: facebook.facebookAuth.clientID,
    clientSecret: facebook.facebookAuth.clientSecret,
    callbackURL: facebook.facebookAuth.callbackURL,
    profileFields: ['id', 'email', 'displayName', 'gender', 'link', 'locale', 'name', 'timezone', 'updated_time', 'verified'],
  },

    function(accessToken, refreshToken, profile, cb) {
      process.nextTick(function () {
        let userInfo = {
          name: profile._json.name,
          fb_id: profile._json.id,
          token: accessToken,
          email: profile._json.email
        };
        db.createNewUser(userInfo);
        return cb(null, userInfo);
      });
    }
  ));
}

// route middleware to make sure a user is logged in
checkAuthentication = (req, res, next) => {
  if (req.isAuthenticated()) {
    //if user is loged in, req.isAuthenticated() will return true
    next();
  } else {
    res.redirect('/login');
  }
};

authHelper = (req, res, next) => {
  localStorage.isAuthenitcated = req.isAuthenticated();
  localStorage.user = req.user || {};
  next();
};

// route for facebook authentication and login
app.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ['email']}));

// handle the callback after facebook has authenticated the user
app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });

// // test database functions
// app.get('/', db.getAllUsers);
app.get('/newUser', db.createNewUser);
app.get('/newTrip', db.createNewTrip);
app.get('/addMembersToTrip', db.addMembersToTrip);
app.get('/addReceipt', db.addReceipt);
app.get('/storeItems', db.storeReceiptItems);
// app.get('/assignItems', db.assignItemsToMembers);

app.get('/login', authHelper, (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect('/');
  } else {
    res.sendFile(path.resolve(__dirname, '..', 'public', 'dist', 'index.html'));
  }
});

// app.post('/recent', function(req,res) {
//   //call query function for latest trip,
//   //res.send(object back to the client)
// });

app.get('/logout', authHelper, function(req, res) {
  req.logout();
  res.redirect('/');
});

app.get('/verify', authHelper, function(req, res) {
  // console.log('LOCAL STORAGE', localStorage);
  db.getAllFriends([localStorage.user.email], (err, result) => {
    if (err) {
      res.status(500).send(err);
    } else {
      let userInfo = {
        isAuthenitcated: localStorage.isAuthenitcated,
        name: localStorage.user.name,
        fb_id: localStorage.user.fb_id,
        email: localStorage.user.email,
        friendsList: result
      };
      res.send(userInfo);
    }
  });
});

app.get('*', checkAuthentication, authHelper, (req, res) => {
  if (!req.user) {
    res.redirect('/login');
  } else {
    res.sendFile(path.resolve(__dirname, '..', 'public', 'dist', 'index.html'));
  }
});



app.get('/summaryReceipt', function(req, res) {
  // console.log('REQ IN SERVER: ', req);
  db.getReceiptsAndTrips(params, function (err, data) {
    if (err) {
      console.log('error: ', err);
      res.send(500);
    } else {
      //got data back
    }

  })
  // send back

})

//To be used for testing and seeing requests
app.post('/createTripName', function(req, res) {
  //With the received request, use model function to submit the tripname to the database

  let params = [
    req.body.submittedTripName,
    localStorage.user.name,
    req.body.submittedTripDesc,
    localStorage.user.fb_id
  ];

  db.createNewTrip(params);
  res.redirect('/upload-receipt');
});

let uploadCloud = () => {
  cloudinary.uploader.upload(__dirname + '/temp/filename.jpg', function(data) {
  });
};
app.post('/upload', function(req, res) {
  if (!req.files) {
    return res.status(400).send('No files were uploaded.');
  }
  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
  let sampleFile = req.files.sampleFile;
  // console.log(sampleFile);
  // Use the mv() method to place the file somewhere on your server
  sampleFile.mv(__dirname + '/temp/filename.jpg', function(err) {
    if (err) {
      return res.status(500).send(err);
    }
    let image = __dirname + '/temp/filename.jpg';
    gVision.promisifiedDetectText(image)
    .then(function(results) {
      let allItems = results[0];
      // uploadCloud();
      res.send(gVision.spliceReceipt(allItems.split('\n')));
    })
    .error(function(e) {
      console.log('Error received in appPost, promisifiedDetectText:', e);
    });
  });
});

app.post('/upload/delete', function(req, res) {
  //req.body should include receipt name, total, receipt_link;
  //should be a delete query
});

app.post('/summary', (req, res) => {
  console.log('req inside server /summary', req);
  db.createMemberSummary(req.body);
});

// this will duplicate with Duy's /recent
app.post('/recent', (req, res) => {
  db.getReceiptsAndTrips([req.body.email], (err, result) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.send(result);
    }
  });
  // db.getReceiptsAndTrips({adminName: req.body.username, tripName: req.body.tripName})
  // .then( (results) => {
  //   res.send(results);
  // });
});

//gVision.spliceReceipt produces an object of item : price pairs
app.post('/vision', function(req, res) {
  let testNumber = 4;
  let image = req.body.receipt || __dirname + `/api/testReceipts/test${testNumber}.jpg`;
  gVision.promisifiedDetectText(image)
  .then(function(results) {
    let allItems = results[0];
    fs.writeFileAsync(`server/api/testResults/test${testNumber}.js`, JSON.stringify(gVision.spliceReceipt(allItems.split('\n'))));
    res.send(gVision.spliceReceipt(allItems.split('\n')));
    // console.log('Successfully created /test.js with:', gVision.spliceReceipt(allItems.split('\n')));
  })
  .error(function(e) {
    console.log('Error received in appPost, promisifiedDetectText:', e);
  });
});

app.post('/addfriend', (req, res) => {
  db.addFriend([req.body.email, req.body.friendEmail], (errAdd, resultAdd) => {
    if (errAdd) {
      res.status(500).send(errAdd);
    } else {
      db.getAllFriends([localStorage.user.email], (errFetch, resultFetch) => {
        if (errFetch) {
          res.status(500).send(errFetch);
        } else {
          res.send([resultAdd, resultFetch]);
        }
      });
    }
  });
});

app.post('/removefriend', (req, res) => {
  db.removeFriend([req.body.email, req.body.friendEmail], (errRemove, resultRemove) => {
    if (errRemove) {
      res.status(500).send(errRemove);
    } else {
      db.getAllFriends([localStorage.user.email], (errFetch, resultFetch) => {
        if (errFetch) {
          res.status(500).send(errFetch);
        } else {
          res.send(resultFetch);
        }
      });
    }
  });
});

app.post('/submit/email', (req, res) => {
  const mailgun = new Mailgun({apiKey: config.mailgunApiKey, domain: config.mailgunDomain});
  const data = {
    from: req.body.senderEmail,
    to: req.body.recipientEmail,
    subject: req.body.subject,
    text: req.body.message
  };
  console.log(data);
  mailgun.messages().send(data, function (err, body) {
    if (err) {
      res.render ('error', { error: err });
      console.log('got an error from mailgun API -------->', err);
    } else {
      console.log(body);
      res.send({status: 'ok'});
    }
  });

});

const port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log(`Listening on ${port}`);
});
