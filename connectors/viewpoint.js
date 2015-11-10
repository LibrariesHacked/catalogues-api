//////////////////////////
// Requires
//////////////////////////
var request = require('request');
var cheerio = require('cheerio');

//////////////////////////
// Variables
//////////////////////////

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {

    var responseHoldings = [];

    // Request 1: The ISBN search
    // This returns a redirect which includes the web page of the item (if in the catalogue)
    request.get({ url: lib.Url + "02_Catalogue/02_004_TitleResults.aspx?page=1&searchType=5&searchTerm=" + isbn }, function (error, msg, res) {

        $ = cheerio.load(res);

        var libraries = {};
        $('#ctl00_ContentPlaceCenterContent_copyAvailabilityContainer').find('table tr').each(function (i, elem) {
            if (i > 0) {
                var library = $(this).find('td').eq(0).text().trim();
                var status = $(this).find('td').eq(3).text().trim();

                if (!libraries[library]) libraries[library] = { available: 0, unavailable: 0 };
                if (status == '') libraries[library].available++;
                if (status != '') libraries[library].unavailable++;
            }
        });

        for (var lib in libraries) {
            responseHoldings.push({ library: lib, available: libraries[lib].available, unavailable: libraries[lib].unavailable });
        }
        callback(responseHoldings);
    });
};