var Genre = require('../models/genre');
var Book = require('../models/book');
var BookInstance = require('../models/bookinstance');
var async = require('async');
const { body,validationResult } = require("express-validator");
const storage = require('node-persist');

// Display list of all Genre.
exports.genre_list = function(req, res) {
    Genre.find()
    .sort([['name', 'ascending']])
    .exec(function (err, list_genres) {
      if (err) { return next(err); }
      //Successful, so render
      storage.getItem('role').then(r =>{
        res.render('./genre_view/genre_list.pug', { title: 'Genre List', genre_list: list_genres, role:r });
      })
      .catch(err=>{
        res.render('./genre_view/genre_list.pug', { title: 'Genre List', genre_list: list_genres });
      })
      
    });
};

// Display detail page for a specific Genre.
exports.genre_detail = function(req, res) {
    async.parallel({
        genre: function(callback) {
            Genre.findById(req.params.id)
              .exec(callback);
        },

        genre_books: function(callback) {
            Book.find({ 'genre': req.params.id })
              .exec(callback);
        },

    }, function(err, results) {
        if (err) { return next(err); }
        if (results.genre==null) { // No results.
            var err = new Error('Genre not found');
            err.status = 404;
            return next(err);
        }
        // Successful, so render
        storage.getItem('role').then(r =>{
          res.render('./genre_view/genre_detail.pug', { title: 'Genre Detail', genre: results.genre, genre_books: results.genre_books,role:r } );
      })
      .catch(err=>{
          res.render('./genre_view/genre_detail.pug', { title: 'Genre Detail', genre: results.genre, genre_books: results.genre_books } );
      })
        
    });
};

// Display Genre create form on GET.
exports.genre_create_get = (req, res)=>{
    
    storage.getItem('role').then(r =>{
      if(r=="admin"){
        res.render('./genre_view/genre_form.pug', { title: 'Create Genre' });
      }
      else{
          res.redirect('/catalog')
      }
  })
  .catch(err=>{
      res.redirect('/catalog')
  })
}
// Handle Genre create on POST.
exports.genre_create_post = [

    // Validate and santize the name field.
    body('name', 'Genre name required').trim().isLength({ min: 1 }).escape(),
  
    // Process request after validation and sanitization.
    (req, res, next) => {
  
      // Extract the validation errors from a request.
      const errors = validationResult(req);
  
      // Create a genre object with escaped and trimmed data.
      var genre = new Genre(
        { name: req.body.name }
      );
  
      if (!errors.isEmpty()) {
        // There are errors. Render the form again with sanitized values/error messages.
        res.render('./genre_view/genre_form.pug', { title: 'Create Genre', genre: genre, errors: errors.array()});
        return;
      }
      else {
        // Data from form is valid.
        // Check if Genre with same name already exists.
        Genre.findOne({ 'name': req.body.name })
          .exec( function(err, found_genre) {
             if (err) { return next(err); }
  
             if (found_genre) {
               // Genre exists, redirect to its detail page.
               res.redirect(found_genre.url);
             }
             else {
  
               genre.save(function (err) {
                 if (err) { return next(err); }
                 // Genre saved. Redirect to genre detail page.
                 res.redirect(genre.url);
               });
  
             }
  
           });
      }
    }
  ];
// Display Genre delete form on GET.
exports.genre_delete_get = function(req, res) {
    async.parallel({
      genre: function(callback) {
        Genre.findById(req.params.id).exec(callback)
      },
      books: function(callback) {
        Book.find({ 'genre': req.params.id }).exec(callback)
      },
  }, function(err, results) {
      if (err) { return next(err); }
      if (results.genre==null) { // No results.
          res.redirect('/catalog/genres');
      }
      // Successful, so render.
      res.render('./genre_view/genre_delete.pug', { title: 'Delete Genre', genre: results.genre, books: results.books } );
  });
};

// Handle Genre delete on POST.
exports.genre_delete_post = function(req, res) {
  async.parallel(
    {
      genre: function(callback) {
        Genre.findById(req.body.genreid).exec(callback)
      },
      books: function(callback) {
        Book.find({ 'genre': req.body.genreid }).exec(callback)
      },
    },
    (err, result) =>{
    if(err) return next(err)

    Book.find({'genre':req.body.genreid})
    .then(result=>{
        result.forEach(r =>{
            BookInstance.remove({'book':r._id}, (err)=>{
                if(err) return next(err);
            })
        })
    })
    Book.remove({'genre':req.body.genreid}, (err)=>{
      if(err) return next(err)
    })
    Genre.findByIdAndRemove(req.body.genreid, (err)=>{
      if(err) {return next(err)}
      res.redirect('/catalog/genres')
    })
  });
};

// Display Genre update form on GET.
exports.genre_update_get = function(req, res) {
  Genre.findById(req.params.id)
  .exec(function (err, genre) {
    if (err) { return next(err); }
    // Successful, so render.
    res.render('./genre_view/genre_form.pug', {title: 'Update Genre', genre: genre});
  });
};

// Handle Genre update on POST.
exports.genre_update_post = [

  // Validate and santize the name field.
  body('name', 'Genre name required').trim().isLength({ min: 1 }).escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {

    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a genre object with escaped and trimmed data.
    var genre = new Genre(
      { name: req.body.name,
        _id: req.params.id
      }
    );

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values/error messages.
      res.render('./genre_view/genre_form.pug', { title: 'Update Genre', genre: genre, errors: errors.array()});
      return;
    }
    else {
      // Data from form is valid.
      // Check if Genre with same name already exists.
      Genre.findOne({ 'name': req.body.name })
        .exec( function(err, found_genre) {
           if (err) { return next(err); }

           if (found_genre) {
             // Genre exists, redirect to its detail page.
             res.redirect(found_genre.url);
           }
           else {

            Genre.findByIdAndUpdate(req.params.id, genre, {}, function (err,thegenre) {
              if (err) { return next(err); }
                 // Successful - redirect to book detail page.
                 res.redirect(thegenre.url);
              });

           }

         });
    }
  }
];  
