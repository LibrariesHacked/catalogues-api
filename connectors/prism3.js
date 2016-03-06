console.log('prism3 connector loading...');

///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and cheerio for
// querying the HTML returned.
///////////////////////////////////////////
var request = require('request'),
    cheerio = require('cheerio');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////
var reqHeader = { "Content-Type": "text/xml; charset=utf-8" };

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
    request.get({ url: service.Url + 'advancedsearch?target=catalogue', timeout: 30000 }, function (error, message, response) {
        if (handleError(error)) return;
        if (reqStatusCheck(message)) return;
        $ = cheerio.load(response);
        $('#locdd option').each(function () {
            if ($(this).text() != '') responseLibraries.libs.push($(this).text());
        });
        responseLibraries.end = new Date();
        callback(responseLibraries);
    });
};

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

    // Request 1: 
    request.get({ url: lib.Url + "items.json?query=" + isbn, headers: reqHeader, timeout: 30000 }, function (error, msg, res) {
        if (handleError(error)) return;
        res = JSON.parse(res);
        var itemUrl = Object.keys(res)[2];
        if (!itemUrl) {
            responseHoldings.end = new Date();
            callback(responseHoldings);
            return;
        }

        // Request 2: 
        request.get({ url: itemUrl, headers: reqHeader, timeout: 30000 }, function (error, msg, res) {
            if (handleError(error)) return;
            $ = cheerio.load(res);
            $('#availability').find('ul.options li').each(function (i, elem) {
                var libr = { library: $(this).find('h3 span span').text().trim(), available: 0, unavailable: 0 };
                $(this).find('div.jsHidden table tbody tr').each(function (i, elem) {
                    lib.Available.indexOf($(this).find('td.item-status span').text().trim()) > -1 ? libr.available++ : libr.unavailable++;
                });
                responseHoldings.availability.push(libr);
            });
            responseHoldings.end = new Date();
            callback(responseHoldings);
        });
    });
};