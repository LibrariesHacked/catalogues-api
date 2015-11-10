////////////////////
// Requires
////////////////////
var async = require('async');
var data = require('./data');

/// On first run this sets up the library service connectors
/// that are currently referred to in the data.json file.
var serviceFunctions = {};
for (service in data.LibraryServices) {
    var type = data.LibraryServices[service].Type;
    if (!serviceFunctions[type] && type != '') {
        var req = require('./connectors/' + type);
        serviceFunctions[type] = req;
    }
}

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
// Function: searchISBNAllServices
// Route: /isbnSearch/:isbn
// Test: http://localhost:3000/isbnSearch/9780747532743
/////////////////////////////////////////////////////////////////
exports.searchISBNAllServices = function (req, res) {
    var searches = data.LibraryServices.map(function (libraryService) {
        return function (callback) {
            serviceFunctions[libraryService.Type].searchByISBN(req.params.isbn, libraryService, function (response) {
                callback(null, response);
            });
        }
    });

    async.parallel(searches, function (err, response) {
        res.send(response);
    });
};

/////////////////////////////////////////////////////////////////
// Function: searchISBNAllServices
// Route: /isbnSearch/:services/:isbn
// Given a list of library services (>0)
// returns the holdings data
// Test: http://localhost:3000/isbnSearch/swindon/9780747532743
/////////////////////////////////////////////////////////////////
exports.searchISBNByServices = function (req, res) {

    var foundLibrary = false;
    for (var i = 0; i < data.LibraryServices.length; i++) {
        if (data.LibraryServices[i].Name.toLowerCase() == req.params.services.toLowerCase()) {
            foundLibrary = true;
            serviceFunctions[data.LibraryServices[i].Type].searchByISBN(req.params.isbn, data.LibraryServices[i], function (response) {
                res.send(response);
            });
        }
    }
    if (!foundLibrary) res.send({ "Error": "Library service not found" });
};