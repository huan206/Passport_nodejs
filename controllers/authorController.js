var async = require('async');
var Author = require('../models/author');
var Book = require('../models/book');
var BookInstance = require('../models/bookinstance');
const storage = require('node-persist');

const { body,validationResult } = require('express-validator');
// Display list of all Authors.
exports.author_list = function(req, res) {
    // Display list of all Authors.
    Author.find()
      .sort([['family_name', 'ascending']])
      .exec(function (err, list_authors) {
        if (err) { return next(err); }
        //Successful, so render
        storage.getItem('role').then(r =>{
            res.render('./author_view/author_list.pug', { title: 'Author List', author_list: list_authors,role:r });
        })
        .catch(err=>{
            res.render('./author_view/author_list.pug', { title: 'Author List', author_list: list_authors });
        })
        
      });
};

// Display detail page for a specific Author.
exports.author_detail = function(req, res) {
    async.parallel({
        author: function(callback) {
            Author.findById(req.params.id)
              .exec(callback)
        },
        authors_books: function(callback) {
          Book.find({ 'author': req.params.id },'title summary')
          .exec(callback)
        },
    }, function(err, results) {
        if (err) { return next(err); } // Error in API usage.
        if (results.author==null) { // No results.
            var err = new Error('Author not found');
            err.status = 404;
            return next(err);
        }
        // Successful, so render.
        storage.getItem('role').then(r =>{
            res.render('./author_view/author_detail.pug', { title: 'Author Detail', author: results.author, author_books: results.authors_books,role:r } );
        })
        .catch(err=>{
            res.render('./author_view/author_detail.pug', { title: 'Author Detail', author: results.author, author_books: results.authors_books } );
        })
        
    });
};

// Display Author create form on GET.
exports.author_create_get = function(req, res) {
   
    storage.getItem('role').then(r =>{
        if(r=="admin"){
            res.render('./author_view/author_form.pug', { title: 'Create Author'});
        }
        else{
            res.redirect('/catalog')
        }
    })
    .catch(err=>{
        res.redirect('/catalog')
    })
};

// Handle Author create on POST.
exports.author_create_post = [

    // Validate and sanitize fields.
    body('first_name').trim().isLength({ min: 1 }).escape().withMessage('First name must be specified.')
        .isAlphanumeric().withMessage('First name has non-alphanumeric characters.'),
    body('family_name').trim().isLength({ min: 1 }).escape().withMessage('Family name must be specified.')
        .isAlphanumeric().withMessage('Family name has non-alphanumeric characters.'),
    body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601().toDate(),
    body('date_of_death', 'Invalid date of death').optional({ checkFalsy: true }).isISO8601().toDate(),

    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/errors messages.
            res.render('./author_view/author_form.pug', { title: 'Create Author', author: req.body, errors: errors.array() });
            return;
        }
        else {
            // Data from form is valid.

            // Create an Author object with escaped and trimmed data.
            var author = new Author(
                {
                    first_name: req.body.first_name,
                    family_name: req.body.family_name,
                    date_of_birth: req.body.date_of_birth,
                    date_of_death: req.body.date_of_death
                });
            author.save(function (err) {
                if (err) { return next(err); }
                // Successful - redirect to new author record.
                res.redirect(author.url);
            });
        }
    }
];
// Display Author delete form on GET.
exports.author_delete_get = function(req, res) {
    async.parallel({
        author: function(callback) {
            Author.findById(req.params.id).exec(callback)
        },
        authors_books: function(callback) {
          Book.find({ 'author': req.params.id }).exec(callback)
        },
    }, function(err, results) {
        if (err) { return next(err); }
        if (results.author==null) { // No results.
            res.redirect('/catalog/authors');
        }
        // Successful, so render.
        res.render('./author_view/author_delete.pug', { title: 'Delete Author', author: results.author, author_books: results.authors_books } );
    });

};

// Handle Author delete on POST.
exports.author_delete_post = function(req, res) {
    async.parallel(
        {
            author: function(callback) {
            Author.findById(req.body.authorid).exec(callback)
            },
            authors_books: function(callback) {
            Book.find({ 'author': req.body.authorid }).exec(callback)
            },
        }, 
    function(err, results) {
        if (err) { return next(err); }
        // Success
        
            // Author has no books. Delete object and redirect to the list of authors.
            Book.find({'author':req.body.authorid})
            .then(result=>{
                result.forEach(r =>{
                    BookInstance.remove({'book':r._id}, (err)=>{
                        if(err) return next(err);
                    })
                })
            })
            Book.remove({'author':req.body.authorid}, (err)=>{
                if(err) return next(err)
            })
            Author.findByIdAndRemove(req.body.authorid, function deleteAuthor(err) {
                if (err) { return next(err); }
                // Success - go to author list
                res.redirect('/catalog/authors')
            })
        
    });
};

// Display Author update form on GET.
exports.author_update_get = function(req, res) {
    async.parallel(
        {
            author:(callback)=>{
                Author.findById(req.params.id)
                .exec(callback)
            }
        },
        (err, results)=>{
            res.render('./author_view/author_form.pug', { title: 'Create Author', author:results.author});
        }
    )
};

// Handle Author update on POST.
exports.author_update_post = [

    // Validate and sanitize fields.
    body('first_name').trim().isLength({ min: 1 }).escape().withMessage('First name must be specified.')
        .isAlphanumeric().withMessage('First name has non-alphanumeric characters.'),
    body('family_name').trim().isLength({ min: 1 }).escape().withMessage('Family name must be specified.')
        .isAlphanumeric().withMessage('Family name has non-alphanumeric characters.'),
    body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601().toDate(),
    body('date_of_death', 'Invalid date of death').optional({ checkFalsy: true }).isISO8601().toDate(),

    // Process request after validation and sanitization.
    (req, res, next) => {

        // Extract the validation errors from a request.
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/errors messages.
            res.render('./author_view/author_form.pug', { title: 'Update Author', author: req.body, errors: errors.array() });
            return;
        }
        else {
            // Data from form is valid.

            // Create an Author object with escaped and trimmed data.
            var author = new Author(
                {
                    _id:req.params.id,
                    first_name: req.body.first_name,
                    family_name: req.body.family_name,
                    date_of_birth: req.body.date_of_birth,
                    date_of_death: req.body.date_of_death
                });
            Author.findByIdAndUpdate(req.params.id, author, {},function (err, author) {
                if (err) { return next(err); }
                // Successful - redirect to new author record.
                res.redirect(author.url);
            });
        }
    }
];
