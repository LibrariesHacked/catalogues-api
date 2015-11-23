///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and cheerio for
// querying the HTML returned.
///////////////////////////////////////////
var request = require('request'),
    cheerio = require('cheerio');
console.log('spydus connector loading...');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////
var searchUrl = 'cgi-bin/spydus.exe/ENQ/OPAC/BIBENQ?ISBN=';

///////////////////////////////////////////
// Function: searchByISBN
///////////////////////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = [];
    // Request 1: Search for page by ISBN
    request.get({ url: lib.Url + searchUrl + isbn }, function (error, msg, res) {
        $ = cheerio.load(res);
        var libs = {};
        $('div.holdings table tr').slice(1).each(function (i, elem) {
            var lib = $(this).find('td').eq(0).text().trim();
            var status = $(this).find('td').eq(3).text().trim();
            if (!libs[lib]) libs[lib] = { available: 0, unavailable: 0 };
            status == 'Available' ? libs[lib].available++ : libs[lib].unavailable++;
        });
        for (var l in libs) responseHoldings.push({ library: lib, available: libs[l].available, unavailable: libs[l].unavailable });
        callback(responseHoldings);
    });
};