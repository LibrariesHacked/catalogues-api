console.log('prism3 connector loading...');

///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and cheerio for
// querying the HTML returned.
///////////////////////////////////////////
var request = require('request'),
    cheerio = require('cheerio');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////
var reqHeader = { "Content-Type": "text/xml; charset=utf-8" };

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

    request.get({ url: lib.Url + "items.json?query=" + isbn, headers: reqHeader }, function (error, msg, res) {
        if (error) {
            handleError(error);
        } else {
            res = JSON.parse(res);
            var itemUrl = Object.keys(res)[2];
            if (itemUrl) {
                request.get({ url: itemUrl, headers: reqHeader }, function (error, msg, res) {
                    if (error) {
                        handleError(error);
                    } else {
                        $ = cheerio.load(res);
                        $('#availability').find('ul.options li').each(function (i, elem) {
                            var lib = { library: $(this).find('h3 span span').text().trim(), available: 0, unavailable: 0 };
                            $(this).find('div.jsHidden table tbody tr').each(function (i, elem) {
                                $(this).find('td.item-status span').text().trim() ? lib.available++ : lib.unavailable++;
                            });
                            responseHoldings.availability.push(lib);
                        });
                        responseHoldings.end = new Date();
                        callback(responseHoldings);
                    }
                });
            } else {
                responseHoldings.end = new Date();
                callback(responseHoldings);
            }
        }
    });
};