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

    // Request 1: Deep link to item page by ISBN.
    request.get({ url: lib.Url + searchUrl + isbn, timeout: 20000 }, function (error, msg, res) {
        if (handleError(error)) return;
        $ = cheerio.load(res);
      
      
        // The search may not find any record, or it may find multiple records
        // If multiple records found, need to trigger the full display
      
      
      
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
    });
};