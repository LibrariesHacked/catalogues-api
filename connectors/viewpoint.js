//////////////////////////
// Requires
//////////////////////////
var request = require('request'),
    cheerio = require('cheerio');
console.log('viewpoint connector loading...');

//////////////////////////
// Variables
//////////////////////////
var searchUrl = '02_Catalogue/02_004_TitleResults.aspx?page=1&searchType=5&searchTerm=';

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = [];
    // Request 1: The ISBN search
    request.get({ url: lib.Url + searchUrl + isbn }, function (error, msg, res) {
        $ = cheerio.load(res);
        var libs = {};
        $('#ctl00_ContentPlaceCenterContent_copyAvailabilityContainer').find('table tr').each(function (i, elem) {
            if (i > 0) {
                var name = $(this).find('td').eq(0).text().trim();
                var status = $(this).find('td').eq(3).text().trim();
                if (!libs[name]) libs[name] = { available: 0, unavailable: 0 };
                status == '' ? libs[name].available++ : libs[name].unavailable++;
            }
        });
        for (var l in libs) responseHoldings.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
        callback(responseHoldings);
    });
};