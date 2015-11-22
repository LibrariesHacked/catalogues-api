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
    // Request 1: 
    request.get({ url: lib.Url + 'uhtbin/cgisirsi.exe/x/0/0/5?searchdata1=' + isbn }, function (error, msg, response) {

        $ = cheerio.load(response);
        var libraries = {};
        var currentLib = '';
        $('table tr').each(function (index, elem) {

            var libr = $(this).find('td.holdingsheader,th.holdingsheader').eq(0).text().trim();
            if (libr && !libraries[libr]) {
                if (libr == 'Copies') libr = $(this).find('.holdingsheader_users_library').eq(0).text().trim();
                currentLib = libr;
                libraries[libr] = { available: 0, unavailable: 0 };
            }

            var status = $(this).find('td.holdingslist').eq(3).text().trim();

            if (status && status != lib.Available) libraries[currentLib].unavailable++;
            if (status && status == lib.Available) libraries[currentLib].available++;
        });

        for (var libr in libraries) responseHoldings.push({ library: libr, available: libraries[libr].available, unavailable: libraries[libr].unavailable });

        callback(responseHoldings);
    });
};