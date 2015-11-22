//////////////////////////
// Requires
//////////////////////////
var request = require('request');
var cheerio = require('cheerio');

//////////////////////////
// Variables
//////////////////////////

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {

    var responseHoldings = [];

    // Request 1: The ISBN search
    request.get({ url: lib.Url + "cgi-bin/koha/opac-search.pl?format=rss2&idx=nb&q=" + isbn }, function (error, msg, res) {

        $ = cheerio.load(res, {
            normalizeWhitespace: true,
            xmlMode: true
        });

        var bibLink = $('guid').text();

        if (bibLink) {
            request.get({ url: bibLink }, function (error, msg, res) {

                $ = cheerio.load(res);

                var libraries = {};
                $('.holdingst tbody').find('tr').each(function (i, elem) {

                    // Fetch the library name, and associated availability status.
                    var lib = $(this).find('td.location span span').eq(1).text().trim();
                    var status = $(this).find('td.status span').text().trim();

                    if (!libraries[lib]) libraries[lib] = { available: 0, unavailable: 0 };
                    if (status == 'Available') libraries[lib].available++;
                    if (status != 'Available') libraries[lib].unavailable++;
                });

                for (var lib in libraries) {
                    responseHoldings.push({ library: lib, available: libraries[lib].available, unavailable: libraries[lib].unavailable });
                }
                callback(responseHoldings);
            });
        } else {
            callback(responseHoldings);
        }
    });
};