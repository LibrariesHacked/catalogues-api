////////////////////
// Requires
////////////////////
var request = require('request'),
    cheerio = require('cheerio');

/////////////
// Variables
////////////

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {

    var responseHoldings = [];
    // Request 1: Use the item deep link URL
    request.get(lib.Url + 'search~S1?/i' + isbn + '/i' + isbn + '/1,1,1,E/holdings&FF=i' + isbn + '&1,1,', function (error, msg, response) {

        var libraries = {};
        $ = cheerio.load(response);
        // Ahh, look at this lovely HTML
        $('table.bibItems tr.bibItemsEntry').each(function (index, elem) {

            var libr = $(this).find('td').eq(0).text().trim();
            var status = $(this).find('td').eq(2).text().trim();

            if (!libraries[libr]) libraries[libr] = { available: 0, unavailable: 0 };
            if (status == 'AVAILABLE') {
                libraries[libr].available++;
            } else {
                libraries[libr].unavailable++;
            }
        });

        for (var libr in libraries) {
            responseHoldings.push({ library: libr, available: libraries[libr].available, unavailable: libraries[libr].unavailable });
        }
        callback(responseHoldings);
    });
};