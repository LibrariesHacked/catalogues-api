console.log('horizon connector loading...');

///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and cheerio for 
// converting querying HTML.
///////////////////////////////////////////
var cheerio = require('cheerio'),
    request = require('request');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////
var catUrl = 'ipac20/ipac.jsp?menu=search&index=ISBNEX&term=';

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = [];
    // Request 1: Use the item deep link URL
    request.get(lib.Url + catUrl + isbn, function (error, msg, response) {
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