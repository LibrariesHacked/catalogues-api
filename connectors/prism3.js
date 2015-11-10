////////////////////
// Requires
////////////////////
var request = require('request');
var cheerio = require('cheerio');

/////////////
// Variables
////////////
var reqHeader = { "Content-Type": "text/xml; charset=utf-8" };

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {

    var responseHoldings = [];

    request.get({ url: lib.Url + "items.json?query=" + isbn , headers: reqHeader }, function (error, msg, res) {

        res = JSON.parse(res);
        var itemUrl = Object.keys(res)[2];

        if (itemUrl) {
            request.get({ url: itemUrl, headers: reqHeader }, function (error, msg, res) {
                $ = cheerio.load(res);

                $('#availability').find('ul.options li').each(function (i, elem) {
                    var library = $(this).find('h3 span span').text().trim();
                    var available = 0;
                    var unavailable = 0;

                    $(this).find('div.jsHidden table tbody tr').each(function (i, elem) {
                        if ($(this).find('td.item-status span').text().trim() == 'Available') available++;
                        if ($(this).find('td.item-status span').text().indexOf('Overdue') != -1) unavailable++;
                        if ($(this).find('td.item-status span').text().indexOf('Due back') != -1) unavailable++;
                    });

                    responseHoldings.push({ library: library, available: available, onLoan: unavailable });

                });

                callback(responseHoldings);
            });
        } else {
            callback(responseHoldings);
        }
    });
};