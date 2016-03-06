console.log('spydus connector loading...');

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
var searchUrl = 'cgi-bin/spydus.exe/ENQ/OPAC/BIBENQ?NRECS=1&ISBN=';
var libsUrl = 'cgi-bin/spydus.exe/MSGTRN/OPAC/COMB?HOMEPRMS=COMBPARAMS';

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
    request.get({ forever: true, url: service.Url + libsUrl, timeout: 30000 }, function (error, message, response) {
        if (handleError(error)) return;
        if (reqStatusCheck(message)) return;

        // This may have thrown up 

        $ = cheerio.load(response);
        $('select#LOC option').each(function () {
            if ($(this).text() != 'All Locations') responseLibraries.libs.push($(this).text());
        });
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

    var getAvailability = function ($) {
        var libs = {};
        $('div.holdings table tr').slice(1).each(function (i, elem) {
            var name = $(this).find('td').eq(0).text().trim();
            var status = $(this).find('td').eq(3).text().trim();
            if (!libs[name]) libs[name] = { available: 0, unavailable: 0 };
            status == 'Available' ? libs[name].available++ : libs[name].unavailable++;
        });
        for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
        responseHoldings.end = new Date();
        callback(responseHoldings);
    };

    // Request 1: Deep link to item page by ISBN.
    request.get({ url: lib.Url + searchUrl + isbn, timeout: 30000 }, function (error, msg, res) {
        if (handleError(error)) return;
        $ = cheerio.load(res);
        // The search may not find any record, or it may find multiple records
        // If multiple records found, need to trigger the full display

        if ($('.holdings').length == 0) {
            responseHoldings.end = new Date();
            callback(responseHoldings);
        } else {
            if ($('.holdings').text().indexOf('see full display for details') != -1) {
                var url = $('.holdings').first().find('a').attr('href');
                request.get({ url: lib.Url + url, timeout: 30000 }, function (error, msg, res) {
                    if (handleError(error)) return;
                    $ = cheerio.load(res);
                    getAvailability($);
                });
            } else {
                getAvailability($);
            }
        }
    });
};