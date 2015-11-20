///////////////////////////////////////////
// Requires
// Use express and custom libraries.js
///////////////////////////////////////////
var express = require('express');
var libraries = require('./libraries');

///////////////////////////////////////////
// Routes
// The web service routes
///////////////////////////////////////////
var app = express();
app.get('/services', libraries.getAllLibraries);
app.get('/isbnSearch/:isbn', libraries.isbnSearch);

///////////////////////////////////////////
// Startup
// Starts up the web service on port 3000
///////////////////////////////////////////
app.listen(3000);
console.log('Listening on port 3000...');