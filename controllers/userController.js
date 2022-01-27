var User = require('../models/user');
// var async = require('async');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var GoogleStrategy = require('passport-google-oauth20').Strategy;
var FaceBookStrategy = require('passport-facebook').Strategy;
var GitHubStrategy = require('passport-github').Strategy;
var mailer = require('../utils/email');
var bcrypt = require('bcrypt');
var code;
const { check, body, validationResult } = require('express-validator');

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
            username: username
        }).then(function (user) {
            if (user == null) {
                return done(null, false, { message: 'The username does not exist' })
            }
            else {
                bcrypt.compare(password, user.password, function (err, result) {
                    if (err) {
                        return done(err);
                    }
                    if (!result) {
                        return done(null, false, { message: 'Incorrect password' });
                    }
                    return done(null, user);
                })
            }
        }).catch(function (err) {
            return done(err);
        })
    }
));

passport.use(new GoogleStrategy({
    clientID: '781009823760-7ekibvct2t9h9gus4t3cifc2mshljp0k.apps.googleusercontent.com',
    clientSecret: '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',
    callbackURL: "https://library-myapplication.herokuapp.com/auth/google/callback"
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
    callbackURL: "https://library-myapplication.herokuapp.com/auth/facebook/callback"
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

passport.use(new GitHubStrategy({
    clientID: '30652d0be1f68699a02c',
    clientSecret: '314916719c3b4291014f8da71e1475fedd8a9f3f',
    callbackURL: 'https://library-myapplication.herokuapp.com/auth/github/callback'
},
    function (accessToken, refreshToken, profile, cb) {
        User.findOne({ githubID: profile.id })
            .then(result => {
                if (result == null) {
                    var user = new User(
                        {
                            username: profile.username,
                            githubID: profile.id
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
    body('username')
        .trim().isLength({ min: 1 }).escape().withMessage('Username must not be empty.')
        .isAlphanumeric().withMessage('Username has non-alphanumeric characters.'),
    body('email')
        .trim().isLength({ min: 1 }).escape().withMessage('Email must not be empty.')
        .withMessage('Email has non-alphanumeric characters.'),
    // check('email')
    //     .isEmail()
    //     .withMessage('Invalid Email')
    //     .custom((value, { req }) => {
    //         return new Promise((resolve, reject) => {
    //             User.findOne({ email: req.body.email }, function (err, user) {
    //                 if (Boolean(user)) {
    //                     reject(new Error('E-mail already in use'))
    //                 }
    //                 resolve(true)
    //             });
    //         });
    //     }),
    body('password')
        .notEmpty().withMessage('Password must not be empty')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 chars'),
    body('confirm_password')
        .notEmpty().withMessage('Confirm password must not be empty')
        .isLength({ min: 6 }).withMessage('Confirm password must be at least 6 chars'),
    check('confirm_password', 'Passwords do not match')
        .exists().custom((value, { req }) => value === req.body.password),
    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            // console.log(errors);
            res.render('register.ejs', { title: 'Create Account', account: req.body, errors: errors.array() });
            return;
        }
        else {
            User.findOne({
                $or: [{ email: req.body.email }, { username: req.body.username }]
            })
                .then(result => {
                    if (result) {
                        res.render('register.ejs', { title: 'Create Account', err: 'The username or email does exist' })
                    }
                    else {
                        code = Math.floor(Math.random() * (999999 - 100000)) + 100000;
                        var subject = "Email for verify"
                        var view = "<h1>Hello</h1><p>This is code for verify your account: "+ code +" </p>";
                        mailer.sendMail(req.body.email, subject, view);
                        res.render('verifyemail.ejs', { title: 'Verify Account', account: req.body, err: undefined })
                    }
                })
                .catch(err => {
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
                var subject = "Notice of successful registrationThanks "
                var view = "<h1>Welcome</h1><p>You have successfully registered</p>";
                mailer.sendMail(req.body.email, subject, view);
                res.redirect("/login");
            });
        })
    }
    else {
        res.render('verifyemail.ejs', { title: 'Verify Account', account: req.body, err: 'Incorrect code' })
    }
}

exports.sendmailFogot = [
    body('email').trim().isLength({ min: 1 }).escape().withMessage('Email must not be empty.')
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
                    if (result) {
                        code = Math.floor(Math.random() * (999999 - 100000)) + 100000;
                        var subject = "Email forgot password"
                        var view = "<h1>Hello</h1><p>This is code for reset password: "+ code +" </p>";
                        mailer.sendMail(req.body.email, subject, view);
                        res.render('verifyforgot.ejs', { title: 'Verify Account', account: result, err: undefined })
                    }
                    else {
                        res.render('forgotpassword.ejs', { title: 'Forgot Password', err: 'The email does not exist' })
                    }
                }
                )

        }
    }
];

exports.updatePassword = (req, res, next) => {
    if (req.body.code == code && req.body.confirm == req.body.password) {
        bcrypt.hash(req.body.password, 10, function (err, hash) {
            User.findByIdAndUpdate(req.body.id, { $set: { password: hash } }, {}, function (err) {
                if (err) { return next(err); }
                res.redirect("/login");
            });

        })
    }
    else {
        res.render('verifyforgot.ejs', { title: 'Verify Account', account: req.body, err: 'Incorrect code or password' })
    }
};
