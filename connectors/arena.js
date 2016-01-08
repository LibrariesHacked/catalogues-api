console.log('durham connector loading...');

///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls)
///////////////////////////////////////////
var request = require('request'),
    cheerio = require('cheerio');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////
var searchUrl = 'results?search_query=organisationId_index:[ORGID] AND number_index:[ISBN]';

//////////////////////////
// Function: searchByISBN
//////////////////////////
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

    // Request 1: Perform the search.
    request.get({ url: lib.Url + searchUrl.replace('[ISBN]',isbn).replace('[ORGID]',lib.OrganisationId), timeout: 10000, jar: true }, function (error, message, response) {
        if (handleError(error)) return;
        console.log(lib.Url + searchUrl.replace('[ISBN]',isbn).replace('[ORGID]',lib.OrganisationId));
        console.log(response);
        // Request 2: After triggering the search, we should then be able to get the availability container XML data
        request.get({ url: lib.url + 'results?random=', headers: { 'Wicket-Ajax': true } }, function () {
            if (handleError(error)) return;
            //console.log(response);
        });
    });
};