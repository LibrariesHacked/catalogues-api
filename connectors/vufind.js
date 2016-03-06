console.log('vufind connector loading');

///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and xml2js for 
// converting xml response to JSON, and 
// cheerio for querying the item page
///////////////////////////////////////////
var request = require('request'),
    xml2js = require('xml2js'),
    cheerio = require('cheerio');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////
var searchUrl = 'Search/Results?view=rss&type=ISN&lookfor=';

///////////////////////////////////////////
// Function: getLibraries
///////////////////////////////////////////
exports.getLibraries = function (service, callback) {
    var responseLibraries = { service: service.Name, libs: [], start: new Date() };
    var handleError = function (error) {
        if (error) {
            responseLibraries.error = error;
            responseLibraries.end = new Date();
            callback(responseLibraries);
            return true;
        }
    };
    var reqStatusCheck = function (message) {
        if (message.statusCode != 200) {
            responseLibraries.error = "Web request error.";
            responseLibraries.end = new Date();
            callback(responseLibraries);
            return true;
        }
    };

    // Request 1: Get advanced search page
    request.get({ forever: true, url: service.Url + 'advanced-search', timeout: 30000 }, function (error, message, response) {
        if (handleError(error)) return;
	if (reqStatusCheck(message)) return;
        responseLibraries.end = new Date();
        callback(responseLibraries);
    });
};

///////////////////////////////////////////
// Function: searchByISBN
///////////////////////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = { service: lib.Name, availability: [], start: new Date() };
    var handleError = function (error) {
        if (error) {
            responseHoldings.error = error;
            responseHoldings.end = new Date();
            callback(responseHoldings);
            return true;
        }
    };

    // Request 1: Search for item
    request.get({ url: lib.Url + searchUrl + isbn, timeout: 30000 }, function (error, message, response) {
        if (handleError(error)) return;
        xml2js.parseString(response, function (err, res) {
            if (handleError(err)) return;
            if (res && res.rss.channel[0].item) {
                // Request 2: Get the item page and then query info using cheerio.
                request.get({ url: res.rss.channel[0].item[0].guid[0]._, timeout: 30000 }, function (error, message, response) {
                    if (handleError(error)) return;
                    $ = cheerio.load(response);
                    $('.record .details h3').each(function (index, elem) {
                        responseHoldings.availability.push({ library: $(this).text().trim(), available: $(this).next('table').find('span.available').length, unavailable: $(this).next('table').find('span.checkedout').length });
                    });
                    responseHoldings.end = new Date();
                    callback(responseHoldings);
                });
            } else {
                responseHoldings.end = new Date();
                callback(responseHoldings);
            }
        });
    });
};