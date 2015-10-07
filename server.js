///
var express = require('express');
var libraries = require('./libraries');
var app = express();

///
app.get('/libraryServices', libraries.getAllLibraries);
app.get('/isbnSearch/:isbn', libraries.searchISBNAllServices);
app.get('/isbnSearch/:service/:isbn', libraries.searchISBNByService);

///
app.listen(3000);
console.log('Listening on port 3000...');