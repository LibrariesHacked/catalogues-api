///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and cheerio for
// querying the HTML returned.
///////////////////////////////////////////
var request = require('request'),
    cheerio = require('cheerio');
console.log('enterprise connector loading...');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////
var searchUrl = 'search/results?qu=[ISBN]';
var itemUrl = 'search/detailnonmodal.detail.detailitemstable_0:loadavailability/0/ent:[ILS]';
var header = { 'X-Requested-With': 'XMLHttpRequest' };

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = [];
    // Request 1: Call the deep link to the item by ISBN
    request.get({ url: lib.Url + searchUrl.replace('', isbn) }, function (error, msg, resp1) {
        var uri = msg.request.uri.path;
        var ils = uri.substring(uri.lastIndexOf("ent:") + 4, uri.lastIndexOf("/one;"));
        // Request 2: A post request returns the data used to show the availability information
        request.post({ url: lib.Url + itemUrl.replace('[ILS]', ils), headers: header }, function (error, msg, resp2) {
            var avail = JSON.parse(resp2);
            $ = cheerio.load(resp1);
            var libs = {};
            $('.detailItemsTableRow').each(function (index, elem) {
                var lib = $(this).find('td').eq(0).text().trim();
                var bc = $(this).find('td').eq(2).text().trim();
                var status = avail.strings[avail.ids.indexOf(bc)].trim();
                if (!libs[lib]) libs[lib] = { available: 0, unavailable: 0 };
                status == 'Standard shelving location' ? libs[lib].available++ : libs[lib].unavailable++;
            });
            for (var l in libs) responseHoldings.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
            callback(responseHoldings);
        });
    });
};