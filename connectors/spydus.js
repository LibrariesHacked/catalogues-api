///////////////////////////////////////////
// Requires
///////////////////////////////////////////
var request = require('request');
var cheerio = require('cheerio');

///////////////////////////////////////////
// Variables
///////////////////////////////////////////

///////////////////////////////////////////
// Function: searchByISBN
///////////////////////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {

    var responseHoldings = [];
    // Request 1: Search for page by ISBN
    request.get({ url: lib.Url + 'cgi-bin/spydus.exe/ENQ/OPAC/BIBENQ?ISBN=' + isbn }, function (error, msg, res) {

        $ = cheerio.load(res);
        var libraries = {};
        $('div.holdings table tr').slice(1).each(function (i, elem) {
            var lib = $(this).find('td').eq(0).text().trim();
            var status = $(this).find('td').eq(3).text().trim();
            if (!libraries[lib]) libraries[lib] = { available: 0, unavailable: 0 };
            if (status == 'Available') {
                libraries[lib].available++;
            } else {
                libraries[lib].unavailable++;
            }
        });

        for (var lib in libraries) {
            responseHoldings.push({ library: lib, available: libraries[lib].available, unavailable: libraries[lib].unavailable });
        }
        callback(responseHoldings);

    });
};