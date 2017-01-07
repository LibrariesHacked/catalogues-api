///////////////////////////////////////////
// SPYDUS
// 
///////////////////////////////////////////
console.log('spydus connector loading...');

///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and cheerio for
// querying the HTML returned.
///////////////////////////////////////////
var request = require('request'),
    cheerio = require('cheerio'),
    common = require('../connectors/common');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////
var searchUrl = 'cgi-bin/spydus.exe/ENQ/OPAC/BIBENQ?NRECS=1&ISBN=';
var libsUrl = 'cgi-bin/spydus.exe/MSGTRN/OPAC/COMB?HOMEPRMS=COMBPARAMS';

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
    var responseLibraries = { service: service.Name, code: service.Code, libraries: [], start: new Date() };

    // Request 1: Get advanced search page
    // They've begun to throw up a full page to agree to cookies (which needs a cookie set to get round).
    request.get({ headers: { Cookie: 'ALLOWCOOKIES_443=1' }, url: service.Url + libsUrl, timeout: 60000 }, function (error, message, response) {
        if (common.handleErrors(callback, responseLibraries, error, message)) return;
        $ = cheerio.load(response);
        $('select#LOC option').each(function () {
            if ($(this).text() != 'All Locations') responseLibraries.libraries.push($(this).text());
        });
        common.completeCallback(callback, responseLibraries);
    });
};

///////////////////////////////////////////
// Function: searchByISBN
///////////////////////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = { service: lib.Name, code: lib.Code, availability: [], start: new Date(), url: lib.Url + searchUrl + isbn };

    var getAvailability = function ($) {
        var libs = {};
        $('div.holdings table tr').slice(1).each(function (i, elem) {
            var name = $(this).find('td').eq(0).text().trim();
            var status = $(this).find('td').eq(3).text().trim();
            if (!libs[name]) libs[name] = { available: 0, unavailable: 0 };
            status == 'Available' ? libs[name].available++ : libs[name].unavailable++;
        });
        for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
        common.completeCallback(callback, responseHoldings);
    };

    // Request 1: Deep link to item page by ISBN.
    request.get({ url: responseHoldings.url, timeout: 30000 }, function (error, msg, res) {
        if (common.handleErrors(callback, responseHoldings, error, msg)) return;
        $ = cheerio.load(res);

        // If nothing found return.
        if ($('.holdings').length == 0) { common.completeCallback(callback, responseHoldings); return; }

        // In some cases (multiple records) there is another page request required to get full details (availability).
        if ($('.holdings').text().indexOf('see full display for details') != -1) {
            // Request 2: Get the full details page for the first record returned.
            request.get({ url: lib.Url + $('.holdings').first().find('a').attr('href'), timeout: 30000 }, function (error, msg, res) {
                if (common.handleErrors(callback, responseHoldings, error, msg)) return;
                getAvailability(cheerio.load(res));
            });
        } else {
            getAvailability($);
        }
    });
};