///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and cheerio for
// querying HTML returned.
///////////////////////////////////////////
var request = require('request'),
    cheerio = require('cheerio');
console.log('webpac connector loading');

///////////////////////////////////////////
// Function: searchByISBN
// 
///////////////////////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = [];
    // Request 1: Use the item deep link URL
    request.get(lib.Url + 'search~S1?/i' + isbn + '/i' + isbn + '/1,1,1,E/holdings&FF=i' + isbn + '&1,1,', function (error, msg, response) {
        var libs = {};
        $ = cheerio.load(response);
        $('table.bibItems tr.bibItemsEntry').each(function (index, elem) {
            var name = $(this).find('td').eq(0).text().trim();
            var status = $(this).find('td').eq(2).text().trim();
            if (!libs[name]) libs[name] = { available: 0, unavailable: 0 };
            status == 'AVAILABLE' ? libs[name].available++ : libs[name].unavailable++;
        });
        for (var l in libs) responseHoldings.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
        callback(responseHoldings);
    });
};