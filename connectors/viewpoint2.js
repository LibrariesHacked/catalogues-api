console.log('viewpoint2 connector loading...');

///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls)
///////////////////////////////////////////
var request = require('request'),
    cheerio = require('cheerio');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////
var searchUrl = '?enqtype=ISBNQUERY&authpara1=';

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = { service: lib.Name, availability: [], start: new Date() };
    var handleError = function (error) {
        if (error){
            responseHoldings.error = error;
            responseHoldings.end = new Date();
            callback(responseHoldings);
            return true;  
        }
    };

    // Request 1: Perform the search.
    request.get({ url: lib.Url + searchUrl + isbn, timeout: 10000 }, function (error, message, response) {

        if (handleError(error)) return;
        $ = cheerio.load(response);
        // Get the more details link - ah some more horrific code :-)
        var moreDetails = null;
        $('a').each(function () {
            if ($(this).attr('href') && $(this).attr('href').indexOf('enqpara1=RESULT&rcn=') != -1) moreDetails = $(this).attr('href');
        });
        if (moreDetails) {
            // Request 2: Return the item details.
            request.get({ url: moreDetails, timeout: 20000 }, function (error, message, response) {
                if (handleError(error)) return;
                // Now parse through the availability table
                $ = cheerio.load(response);
                var libs = {};
                $('table.viewpointdisplaybottomavailablebox tr').slice(1).each(function (row) {
                    var name = $(this).find('td').eq(0).text().trim();
                    var status = $(this).find('td').eq(2).text().trim();
                    if (!libs[name]) libs[name] = { available: 0, unavailable: 0 };
                    status == lib.Available ? libs[name].available++ : libs[name].unavailable++;
                });
                for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
                responseHoldings.end = new Date();
                callback(responseHoldings);
            });
        } else {
            responseHoldings.end = new Date();
            callback(responseHoldings);
        }
    });
};