var express = require('express');
var router = express.Router();
var passport = require('passport');
var user_controller = require('../controllers/userController');

router.get('/', user_controller.checkAuthenticated, user_controller.homepage);

router.get('/login', user_controller.checkNotAuthenticated, user_controller.login);

router.post('/login',
  passport.authenticate('local', { failureRedirect: '/login', failureMessage: true }),
  function (req, res) {
    res.redirect('/');
  });

router.get('/signup', function (req, res, next) {
  res.render('register.ejs', { title: "Create Account", err: undefined });
});

router.post('/signup', user_controller.signup);

router.post('/verify', user_controller.createAccount);

router.get('/sendmail_forget', function (req, res, next) {
  res.render('forgotpassword.ejs', { title: "Forgot Password", err:undefined});
})
router.post('/sendmail_forget', user_controller.sendmailFogot );
router.post('/new_password', user_controller.updatePassword );

router.get('/login/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });

router.get('/login/facebook',
  passport.authenticate('facebook', { scope: ['email'] }));

router.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });

router.get('/login/github', passport.authenticate('github'));

router.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login', failureMessage: true }),
  function (req, res) {
    res.redirect('/');
  }); 
router.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/login');
});

module.exports = router;
