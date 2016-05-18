///////////////////////////////////////////
// VUFIND
// 
///////////////////////////////////////////
console.log('vufind connector loading');

///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and xml2js for 
// converting xml response to JSON, and 
// cheerio for querying the item page
///////////////////////////////////////////
var request = require('request'),
    xml2js = require('xml2js'),
    cheerio = require('cheerio'),
    common = require('../connectors/common');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////
var searchUrl = 'Search/Results?view=rss&type=ISN&lookfor=';

///////////////////////////////////////////
// Function: getService
///////////////////////////////////////////
exports.getService = function (svc, callback) {
    var service = common.getService(svc);
    callback(service);
};

///////////////////////////////////////////
// Function: getLibraries
///////////////////////////////////////////
exports.getLibraries = function (service, callback) {
    var responseLibraries = { service: service.Name, libraries: [], start: new Date() };

    // Request 1: Get advanced search page
    request.get({ url: service.Url + 'Search/Advanced', timeout: 60000 }, function (error, message, response) {
        if (common.handleErrors(callback, responseLibraries, error, message)) return;
        $ = cheerio.load(response);
        $('option[value*="building"]').each(function () {
            responseLibraries.libraries.push($(this).text());
        });
        common.completeCallback(callback, responseLibraries);
    });
};

///////////////////////////////////////////
// Function: searchByISBN
///////////////////////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = { service: lib.Name, availability: [], start: new Date() };

    // Request 1: Search for item
    request.get({ url: lib.Url + searchUrl + isbn, timeout: 30000 }, function (error, message, response) {
        if (common.handleErrors(callback, responseHoldings, error, message)) return;
        xml2js.parseString(response, function (err, res) {
            if (common.handleErrors(callback, responseHoldings, err)) return;

            // Nothing found- return.
            if (!res || !res.rss.channel[0].item) {
                common.completeCallback(callback, responseHoldings);
                return;
            }

            // Request 2: Get the item page and then query info using cheerio.
            request.get({ url: res.rss.channel[0].item[0].guid[0]._, timeout: 30000 }, function (error, message, response) {
                if (common.handleErrors(callback, responseHoldings, error, message)) return;
                $ = cheerio.load(response);
                $('.record .details h3').each(function (index, elem) {
                    responseHoldings.availability.push({ library: $(this).text().trim(), available: $(this).next('table').find('span.available').length, unavailable: $(this).next('table').find('span.checkedout').length });
                });
                common.completeCallback(callback, responseHoldings);
            });
        });
    });
};