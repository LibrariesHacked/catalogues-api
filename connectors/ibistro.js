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

        $('#panel1 table tbody tr');
        console.log(response);

    });

};