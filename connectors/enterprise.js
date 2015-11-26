console.log('enterprise connector loading...');

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
var searchUrl = 'search/results?qu=';
var itemUrl = 'search/detailnonmodal.detail.detailitemstable_0:loadavailability/0/ent:[ILS]';
var header1 = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Safari/537.36 Edge/13.10586' };
var header2 = { 'X-Requested-With': 'XMLHttpRequest' };

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = [];
    // Request 1: Call the deep link to the item by ISBN
    request.get({ url: lib.Url + searchUrl + isbn, headers: header1 }, function (error, msg, resp1) {

        // Internal function to get availability - called either immediately (if redirected onto the main item page)
        // Or after a second request to go to the item page.
        var getItemAvailability = function (ils, itemPage) {
            // Request 2: A post request returns the data used to show the availability information
            request.post({ url: lib.Url + itemUrl.replace('[ILS]', ils.split('/').join('$002f')), headers: header2 }, function (error, msg, resp2) {
                console.log(resp2);
                var avail = JSON.parse(resp2);
                $ = cheerio.load(resp1);
                var libs = {};
                $('.detailItemsTableRow').each(function (index, elem) {
                    var name = $(this).find('td').eq(0).text().trim();
                    var bc = $(this).find('td').eq(2).text().trim();
                    var status = avail.strings[avail.ids.indexOf(bc)].trim();
                    if (!libs[name]) libs[name] = { available: 0, unavailable: 0 };
                    status == lib.Available ? libs[name].available++ : libs[name].unavailable++;
                });
                for (var l in libs) responseHoldings.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
                callback(responseHoldings);
            });
        }

        var uri = msg.request.uri.path;
        var ils = uri.substring(uri.lastIndexOf("ent:") + 4, uri.lastIndexOf("/one;"));

        // Bail out here if we don't get back an ID.
        if (!ils) callback(responseHoldings);

        if (ils == '/cl') {
            // In this situation need to call the item page.
            ils = null;
            $ = cheerio.load(resp1);
            if ($('#da0').attr('value')) ils = $('#da0').attr('value').substring($('#da0').attr('value').lastIndexOf("ent:") + 4);
        } else {
            getItemAvailability(ils, resp1)
        }
    });
};