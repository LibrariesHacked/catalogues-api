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
    var responseHoldings = { service: lib.Name, availability: [], start: new Date() };
    var handleError = function (error) {
        responseHoldings.error = error;
        responseHoldings.end = new Date();
        callback(responseHoldings);
    };

    // Request 1: initialise the session - go to home page.
    request.get(lib.Url, function (error, message, response) {




        // Request 2: Go to catalogue page.


        // Request 3: Postback search


        // Request 4: Postback 


        // Request 5: Postback




        // Click to get book details "ctl00$cph1$lvResults$ctrl0$lnkbtnTitle"
        // Postback https://libraryonline.durham.gov.uk/pgCatKeywordResults.aspx?KEY=1980835&ITEMS=1
        responseHoldings.end = new Date();
        callback(responseHoldings);
    });
};