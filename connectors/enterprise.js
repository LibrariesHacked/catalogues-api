////////////////////
// Requires
////////////////////
var request = require('request');
var cheerio = require('cheerio');
    
/////////////
// Variables
////////////

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {

    var responseHoldings = [];
    request.get({ url: lib.Url + 'client/default/search/results?qu=' + isbn }, function (error, msg, resp1) {
        var uri = msg.request.uri.path;
        var ils = uri.substring(uri.lastIndexOf("ent:") + 4, uri.lastIndexOf("/one;"));

        request.post({ url: lib.Url + 'client/default/search/detailnonmodal.detail.detailitemstable_0:loadavailability/0/ent:' + ils, headers: { 'X-Requested-With': 'XMLHttpRequest' } }, function (error, msg, resp2) {

            var avail = JSON.parse(resp2);
            $ = cheerio.load(resp1);
            var libraries = {};
            $('.detailItemsTableRow').each(function (index, elem) {
                var lib = $(this).find('td').eq(0).text().trim();
                var bc = $(this).find('td').eq(2).text().trim();
                var status = avail.strings[avail.ids.indexOf(bc)].trim();

                if (!libraries[lib]) libraries[lib] = { available: 0, unavailable: 0 };
                if (status == 'Standard shelving location') {
                    libraries[lib].available++;
                } else {
                    libraries[lib].unavailable++;
                }
            });

            for (var lib in libraries) responseHoldings.push({ library: lib, available: libraries[lib].available, unavailable: libraries[lib].unavailable });

            callback(responseHoldings);
        });
    });
};