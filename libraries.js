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
// Function: getServices
// Route: /services
// Returns a filtered contents of the data.json
// in order to list services.
// Test: http://localhost:3000/services
/////////////////////////////////////////////////////////////////
exports.getServices = function (req, res) {
    var services = data.LibraryServices
        // Could put a filter here e.g. if filter by area (North East) or even spatial. 
        .filter(function (service) {
            return (service.Type != '' && (!req.query.service || service.Name.indexOf(req.query.service) > -1));
        })
        .map(function (service) {
            return function (callback) {
                serviceFunctions[service.Type].getService(service, function (response) {
                    callback(null, response);
                });
            }
        });
    // The searches object will be a list of searches to run against the various library systems.  
    async.parallel(services, function (err, response) {
        res.send(response);
    });
};

/////////////////////////////////////////////////////////////////
// Function: getLibraries
// Route: /libraries
// Test: http://localhost:3000/libraries?service=Wiltshire
/////////////////////////////////////////////////////////////////
exports.getLibraries = function (req, res) {

    // Create a list of the searches to perform.
    var searches = data.LibraryServices
        .filter(function (service) {
            return (service.Type != '' && (!req.query.service || service.Name.indexOf(req.query.service) > -1));
        })
        .map(function (service) {
            return function (callback) {
                serviceFunctions[service.Type].getLibraries(service, function (response) {
                    callback(null, response);
                });
            }
        });

    // The searches object will be a list of searches to run against the various library systems.  
    async.parallel(searches, function (err, response) {
        res.send(response);
    });
};

/////////////////////////////////////////////////////////////////
// Function: isbnSearch
// Route: /availabilityByISBN/:isbn
// Test: http://localhost:3000/availabilityByISBN/9780747532699?service=Wiltshire
// (Harry Potter and the Philosopher's Stone).
/////////////////////////////////////////////////////////////////
exports.isbnSearch = function (req, res) {

    // Create a list of the searches to perform.
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

    // The searches object will be a list of searches to run against the various library systems.  
    async.parallel(searches, function (err, response) {
        res.send(response);
    });
};

/////////////////////////////////////////////////////////////////
// Function: test
// Route: /test
// Test: http://localhost:3000/test?service=Wiltshire
// Tests using an ISBN that is known to be in the relevant catalogues
// Does some logging to the console.
/////////////////////////////////////////////////////////////////
exports.test = function (req, res) {

    // For the browser just send a standard response but then run the tests.
    res.send('Tests starting, check console window.')

    // Create a list of the searches to perform.
    var searches = data.LibraryServices
        .filter(function (service) {
            return (service.Type != "" && (!req.query.service || service.Name.indexOf(req.query.service) > -1));
        })
        .map(function (service) {
            return function (callback) {
                console.log('Running test for ' + service.Name);
                serviceFunctions[service.Type].searchByISBN(service.TestISBN, service, function (response) {
                    console.log('Response: ' + JSON.stringify(response));
                    callback(null, response);
                });
            }
        });

    // As it's for testing, run in serial to be able to keep track. 
    async.series(searches, function (err, response) {
        res.send(response);
    });
};