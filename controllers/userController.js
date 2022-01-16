var User = require('../models/user');
// var async = require('async');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var GoogleStrategy = require('passport-google-oauth20').Strategy;
var FaceBookStrategy = require('passport-facebook').Strategy;
var mailer = require('../utils/email');
// var TwitterStrategy = require('passport-twitter');
var bcrypt = require('bcrypt');
var code;
const { body, validationResult } = require('express-validator');

passport.serializeUser(function (user, done) {
    if (user.googleID) {
        done(null, user)
    }
    else {
        done(null, user.id);
    }
});

passport.deserializeUser(function (id, done) {

    if (id.id) {
        done(null, {
            username: id.displayName,
        })
    }
    else {
        User.findById(id, function (err, user) {
            done(err, user);
        });
    }

});

passport.use(new LocalStrategy(
    function (username, password, done) {

        User.findOne({
            username : username
        }).then(function (user) {
            bcrypt.compare(password, user.password, function (err, result) {
                if (err) {
                    return done(err);
                }
                if (!result) {
                    return done(null, false, { message: 'Incorrect username or password' });
                }
                return done(null, user);
            })
        }).catch(function (err) {
            return done(err);
        })
    }
));

passport.use(new GoogleStrategy({
    clientID: '781009823760-7ekibvct2t9h9gus4t3cifc2mshljp0k.apps.googleusercontent.com',
    clientSecret: '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',
    callbackURL: "http://localhost:3000/auth/google/callback"
},
    function (accessToken, refreshToken, profile, cb) {
        User.findOne({ googleID: profile.id })
            .then(result => {
                if (result == null) {
                    var user = new User(
                        {
                            username: profile.displayName,
                            email: profile.emails[0].value,
                            googleID: profile.id
                        });
                    user.save();
                    return cb(null, user)
                }
                else {
                    return cb(null, result)
                }
            })
            .catch(err => {
                console.log(err);
            })

    }
));

passport.use(new FaceBookStrategy({
    clientID: "1721561728034335",
    clientSecret: "312b7a5f083d960656acfc377168bcae",
    callbackURL: "http://localhost:3000/auth/facebook/callback"
},
    function (accessToken, refreshToken, profile, cb) {
        User.findOne({ facebookID: profile.id })
            .then(result => {
                if (result == null) {
                    var user = new User(
                        {
                            username: profile.displayName,
                            facebookID: profile.id
                        });
                    user.save();
                    return cb(null, user)
                }
                else {
                    return cb(null, result)
                }
            })
            .catch(err => {
                console.log(err);
            })
    }
));

// passport.use(new TwitterStrategy({
//     consumerKey: TWITTER_CONSUMER_KEY,
//     consumerSecret: TWITTER_CONSUMER_SECRET,
//     callbackURL: "http://127.0.0.1:3000/auth/twitter/callback"
//   },
//   function(token, tokenSecret, profile, cb) {
//     User.findOrCreate({ twitterId: profile.id }, function (err, user) {
//       return cb(err, user);
//     });
//   }
// ));

exports.checkAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next()
    }

    res.redirect('/login')
}

exports.checkNotAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return res.redirect('/')
    }
    next()
}

exports.homepage = function (req, res) {
    res.render('index.ejs', { title: 'Homepage', username: req.user.username });
};

exports.login = function (req, res) {
    res.render('login.ejs', { title: 'Login to Account' });
};

exports.signup = [
    body('username').trim().isLength({ min: 1 }).escape().withMessage('First name must be specified.')
        .isAlphanumeric().withMessage('Username has non-alphanumeric characters.'),
    body('email').trim().isLength({ min: 1 }).escape().withMessage('Family name must be specified.')
        .withMessage('Email has non-alphanumeric characters.'),
    body('password').trim().isLength({ min: 1 }).escape().withMessage('Family name must be specified.')
        .isAlphanumeric().withMessage('Password has non-alphanumeric characters.'),
    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            console.log(errors);
            res.render('register.ejs', { title: 'Create Account', account: req.body, errors: errors.array() });
            return;
        }
        else {
            User.findOne({
                $or:[{email: req.body.email},{username:req.body.username}]
            })
            .then(result =>{
                if(result){
                    res.redirect('/signup')
                }
                else{
                    code = Math.floor(Math.random() * (999999 - 100000)) + 100000;
                    console.log(code);
                    // mailer.sendMail(req.body.email, code);
                    res.render('verifyemail.ejs', { title: 'Verify Account', account: req.body })
                }
            })
            .catch(err=>{
                console.log(err);
            })
            
        }
    }
]

exports.createAccount = (req, res, next) => {
    if (req.body.code == code) {
        bcrypt.hash(req.body.password, 10, function (err, hash) {

            var user = new User(
                {
                    username: req.body.username,
                    email: req.body.email,
                    password: hash
                });

            user.save(function (err) {
                if (err) {
                    return next(err);
                }
                res.redirect("/login");
            });
        })
    }
    else {
        res.render('verifyemail.ejs', { title: 'Verify Account', account: req.body })
    }
    // Create an User object with escaped and trimmed data.
}

exports.sendmailFogot = [
    body('email').trim().isLength({ min: 1 }).escape().withMessage('Family name must be specified.')
        .withMessage('Email has non-alphanumeric characters.'),
    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            res.render('register.ejs', { title: 'Create Account', account: req.body, errors: errors.array() });
            return;
        }
        else {
            
            User.findOne({
                email: req.body.email
            })
                .then(result => {
                    if(result){
                        code = Math.floor(Math.random() * (999999 - 100000)) + 100000;
                        console.log(code);
                        // mailer.sendMail(req.body.email, code);
                        res.render('verifyforgot.ejs', { title: 'Verify Account', account: result })
                    }
                    else{
                        res.render('forgotpassword.ejs',{title: 'Forgot Password', err:'The email does not exist'})
                    }
                }
                )

        }
    }
];

exports.updatePassword = (req, res, next) => {
    console.log(req.body);
    if (req.body.code == code && req.body.confirm == req.body.password) {
        bcrypt.hash(req.body.password, 10, function (err, hash) {
            User.findByIdAndUpdate(req.body.id, { $set: { password: hash } }, {}, function (err) {
                if (err) { return next(err); }
                res.redirect("/login");
            });

        })
    }
    else {
        res.render('verifyforgot.ejs', { title: 'Verify Account', account: req.body })
    }
};
