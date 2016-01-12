///////////////////////////////////////////
// REQUIRES
// Load async so that requests to libraries 
// can be done in parallel, and the data file.
///////////////////////////////////////////
var async = require('async');
var data = require('./data');

// On first run this sets up all the library service connectors
// that are currently referred to in the data.json file.
var serviceFunctions = {};
data.LibraryServices.forEach(function (service) {
    if (!serviceFunctions[service.Type]) serviceFunctions[service.Type] = require('./connectors/' + service.Type);
});

/////////////////////////////////////////////////////////////////
// Function: getAllLibraries
// Route: /services
// Returns the contents of the data.json
// in order to list services.
// Test: http://localhost:3000/services
/////////////////////////////////////////////////////////////////
exports.getAllLibraries = function (req, res) {
    res.send(data.LibraryServices);
};

/////////////////////////////////////////////////////////////////
// Function: isbnSearch
// Route: /availabilityByISBN/:isbn
// Test: http://localhost:3000/availabilityByISBN/9780747532743?service=Wiltshire
/////////////////////////////////////////////////////////////////
exports.isbnSearch = function (req, res) {
    var searches = data.LibraryServices
        .filter(function (service) {
            return (service.Type != "" && (!req.query.service || service.Name.indexOf(req.query.service) > -1));
        })
        .map(function (service) {
            return function (callback) {
                serviceFunctions[service.Type].searchByISBN(req.params.isbn, service, function (response) {
                    callback(null, response);
                });
            }
        });
    async.parallel(searches, function (err, response) {
        res.send(response);
    });
};