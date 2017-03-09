///////////////////////////////////////////
// REQUIRES
// Load async so that requests to libraries 
// can be done in parallel, and the data file.
///////////////////////////////////////////
var async = require('async');
var data = require('./data/data');
var libThing = require('./connectors/librarything');
var openLibrary = require('./connectors/openlibrary');

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
        // Could put a filter here e.g. if filter by region (North East) or even spatial. 
        .filter(function (service) {
            return (service.Type != '' && (!req.query.service || service.Name == req.query.service));
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
// Function: getServiceGeo
// Route: /servicegeo
// Returns the geographical boundary of a service
// Test: http://localhost:3000/servicegeo?service=Wiltshire
/////////////////////////////////////////////////////////////////
exports.getServiceGeo = function (req, res) {
    var servicegeo = null;
    data.LibraryServices.some(function (s, i) {
        if (req.query.service == s.Code || req.query.service == s.Name) { servicegeo = require('./data/geography/' + s.Code); return true; }
    });
    res.send(servicegeo);
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
            return (service.Type != '' && (!req.query.service || service.Name == req.query.service || service.Code == req.query.service));
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
// Test: http://localhost:3000/thingISBN/9780747532699
// (Harry Potter and the Philosopher's Stone).
/////////////////////////////////////////////////////////////////
exports.isbnSearch = function (req, res) {
    // Create a list of the searches to perform.
    var searches = data.LibraryServices
        .filter(function (service) {
            return (service.Type != '' && (!req.query.service || service.Name == req.query.service || service.Code == req.query.service));
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
// Function: thingISBN
// Route: /thingISBN
// Proxies the thingISBN service from Library Thing
// to retrieve a list of other editions from a work.
// Test: http://localhost:3000/thingISBN/9780747532699
/////////////////////////////////////////////////////////////////
exports.thingISBN = function (req, res) {
    libThing.thingISBN(req.params.isbn, function (data) {
        res.send(data.isbns);
    });
};

/////////////////////////////////////////////////////////////////
// Function: openLibrarySearch
// Route: /openLibrarySearch
// Proxies the thingISBN service from Library Thing
// to retrieve a list of other editions from a work.
// Test: http://localhost:3000/openLibrarySearch?q=Harry Potter
/////////////////////////////////////////////////////////////////
exports.openLibrarySearch = function (req, res) {
    openLibrary.search(req.query.q, function (data) {
        res.send(data);
    });
};

/////////////////////////////////////////////////////////////////
// Function: test
// Route: /test
// Test: http://localhost:3000/test?service=Wiltshire
// Tests using an ISBN that is known to be in the relevant catalogues
// Does some logging to the console.
/////////////////////////////////////////////////////////////////
exports.testIsbnSearch = function (req, res) {
    // For the browser just send a standard response but then run the tests.
    res.send('Tests starting, check console window.')
    // Create a list of the searches to perform.
    var searches = data.LibraryServices
        .filter(function (service) {
            return (service.Type != '' && (!req.query.service || service.Name == req.query.service || service.Code == req.query.service));
        })
        .map(function (service) {
            return function (callback) {
                console.log('Running test for ' + service.Name);
                serviceFunctions[service.Type].searchByISBN(service.TestISBN, service, function (response) {
                    if (response.availability.length == 0) console.log('None found: ' + JSON.stringify(response));
                    callback(null, response);
                });
            }
        });
    // Run in serial to be able to keep track. 
    async.series(searches, function (err, response) { });
};