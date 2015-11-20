///////////////////////////////////////////
// Requires
///////////////////////////////////////////
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
// Function: isbnSearch
// Route: /isbnSearch/:isbn
// Test: http://localhost:3000/isbnSearch/9780747532743?libraries=wiltshire
/////////////////////////////////////////////////////////////////
exports.isbnSearch = function (req, res) {

    var searches = data.LibraryServices
        .filter(function (service) {
            return (!req.query.library || req.query.library.indexOf(service.Name) > -1);
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