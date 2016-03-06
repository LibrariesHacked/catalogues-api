console.log('heritage connector loading...');

///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and xml2js for 
// converting xml response to JSON
///////////////////////////////////////////
var cheerio = require('cheerio'),
    request = require('request');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////
var searchUrl = 'search2?searchTerm0=';

///////////////////////////////////////////
// Function: getLibraries
// Placeholder
///////////////////////////////////////////
exports.getLibraries = function (service, callback) {
    callback({ service: service.Name, libs: service.Libraries, start: new Date(), end: new Date() });
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
    var reqStatusCheck = function (message) {
        if (message.statusCode != 200) {
            responseLibraries.error = "Web request error.";
            responseLibraries.end = new Date();
            callback(responseLibraries);
            return true;
        }
    };

    // Request 1: Get the deep link URL
    request.get({ url: lib.Url + searchUrl + isbn, jar: true, timeout: 60000 }, function (error, message, response) {
        if (handleError(error)) return;
        $ = cheerio.load(response);
        var libs = {};
        $('tbody.faccs tr').each(function () {
            var name = $(this).find('td').eq(3).text().trim();
            var status = $(this).find('td span').text().trim();
            if (!libs[name]) libs[name] = { available: 0, unavailable: 0 }
            status != 'On Loan' ? libs[name].available++ : libs[name].unavailable++;
        });
        for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
        responseHoldings.end = new Date();
        callback(responseHoldings);
    });
};