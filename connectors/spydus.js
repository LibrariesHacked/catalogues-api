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
var searchUrl = 'cgi-bin/spydus.exe/ENQ/OPAC/BIBENQ?ISBN=';

///////////////////////////////////////////
// Function: searchByISBN
///////////////////////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = [];
    // Request 1: Deep link to item page by ISBN.
    request.get({ url: lib.Url + searchUrl + isbn }, function (error, msg, res) {
        $ = cheerio.load(res);
        var libs = {};
        $('div.holdings table tr').slice(1).each(function (i, elem) {
            var name = $(this).find('td').eq(0).text().trim();
            var status = $(this).find('td').eq(3).text().trim();
            if (!libs[name]) libs[name] = { available: 0, unavailable: 0 };
            status == 'Available' ? libs[name].available++ : libs[name].unavailable++;
        });
        for (var l in libs) responseHoldings.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
        callback(responseHoldings);
    });
};