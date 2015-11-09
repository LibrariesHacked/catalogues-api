//////////////////////
// Requires
//
//////////////////////
var express = require('express');
var libraries = require('./libraries');

////////////////////////////
// Routes
// The web service routes
////////////////////////////
var app = express();
app.get('/services', libraries.getAllLibraries);
app.get('/isbnSearch/:isbn', libraries.searchISBNAllServices);
app.get('/isbnSearch/:services/:isbn', libraries.searchISBNByServices);

//////////////////////////////////////////
// Startup
// Starts up the web service
//////////////////////////////////////////
app.listen(3000);
console.log('Listening on port 3000...');