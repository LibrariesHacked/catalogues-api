console.log('durham connector loading...');

///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls)
///////////////////////////////////////////
var request = require('request');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {

    var responseHoldings = [];
    // Initialise the session
    request.get(lib.Url, function (error, message, response) {
        // Click to get book details "ctl00$cph1$lvResults$ctrl0$lnkbtnTitle"

        // Postback https://libraryonline.durham.gov.uk/pgCatKeywordResults.aspx?KEY=1980835&ITEMS=1
        callback(responseHoldings);
    });
};