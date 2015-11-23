///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and cheerio for
// querying the HTML returned.
///////////////////////////////////////////
var request = require('request'),
    cheerio = require('cheerio');
console.log('ibistro connector loading...');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////
var searchUrl = 'uhtbin/cgisirsi.exe/x/0/0/5?searchdata1=';

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = [];
    // Request 1: 
    request.get({ url: lib.Url + searchUrl + isbn }, function (error, msg, response) {
        $ = cheerio.load(response);
        var libs = {};
        var currentLib = '';
        $('table tr').each(function (index, elem) {
            var libr = $(this).find('td.holdingsheader,th.holdingsheader').eq(0).text().trim();
            if (libr && !libs[libr]) {
                if (libr == 'Copies') libr = $(this).find('.holdingsheader_users_library').eq(0).text().trim();
                currentLib = libr;
                libs[libr] = { available: 0, unavailable: 0 };
            }
            var status = $(this).find('td.holdingslist').eq(3).text().trim();
            status == lib.Available ? libs[currentLib].available++ : libs[currentLib].unavailable++;
        });
        for (var l in libs) responseHoldings.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
        callback(responseHoldings);
    });
};