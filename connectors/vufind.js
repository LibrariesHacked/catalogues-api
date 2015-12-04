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
// Function: searchByISBN
///////////////////////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = { service: lib.Name, availability: [], start: new Date() };
    var handleError = function (error) {
        responseHoldings.error = error;
        responseHoldings.end = new Date();
        callback(responseHoldings);
    };

    // Request 1: Search for item
    request.get(lib.Url + searchUrl + isbn, function (error, message, response) {



        xml2js.parseString(response, function (err, res) {
            if (res && res.rss.channel[0].item) {
                // Request 2: Get the item page and then query info using cheerio.
                // Can't use this unforunately /AJAX/JSON?method=getItemStatuses&id[]=654560
                request.get(res.rss.channel[0].item[0].guid[0]._, function (error, message, response) {
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