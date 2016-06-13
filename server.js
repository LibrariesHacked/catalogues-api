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
app.get('/services', libraries.getServices);
app.get('/libraries', libraries.getLibraries);
app.get('/availabilityByISBN/:isbn', libraries.isbnSearch);

// For maintenance
// app.get('/refreshbranches', libraries.refreshBranches)
// app.get('/refreshservicetwitters', libraries.refreshServiceTwitters);
// app.get('/refreshbranchtwitters', libraries.refreshBranchTwitters);

// For testing
app.get('/testAvailabilityByISBN', libraries.testIsbnSearch);

///////////////////////////////////////////
// Startup
// Starts up the web service on port 3000
///////////////////////////////////////////
app.listen(3000);
console.log('Listening on port 3000...');