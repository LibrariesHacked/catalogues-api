console.log('koha connector loading...');

///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and cheerio for
// querying the HTML returned.
///////////////////////////////////////////
var request = require('request'),
    cheerio = require('cheerio');

//////////////////////////
// VARIABLES
//////////////////////////
var catUrl = 'cgi-bin/koha/opac-search.pl?format=rss2&idx=nb&q=';

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = [];
    // Request 1: The ISBN search
    request.get({ url: lib.Url + catUrl + isbn }, function (error, msg, res) {
        $ = cheerio.load(res, { normalizeWhitespace: true, xmlMode: true });
        var bibLink = $('guid').text();
        if (bibLink) {
            request.get({ url: bibLink }, function (error, msg, res) {
                $ = cheerio.load(res);
                var libs = {};
                $('.holdingst tbody').find('tr').each(function (i, elem) {
                    var lib = $(this).find('td.location span span').eq(1).text().trim();
                    var status = $(this).find('td.status span').text().trim();
                    if (!libs[lib]) libs[lib] = { available: 0, unavailable: 0 };
                    status == 'Available' ? libs[lib].available++ : libs[lib].unavailable++;
                });
                for (var l in libs) responseHoldings.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
                callback(responseHoldings);
            });
        } else {
            callback(responseHoldings);
        }
    });
};