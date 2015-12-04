console.log('bibliocommons connector loading...');

///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and xml2js for 
// converting xml response to JSON
///////////////////////////////////////////
var xml2js = require('xml2js'),
    request = require('request');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////
var searchUrl = 'SearchCatalog/KEYWORD/';
var reqHeader = { "Content-Type": "text/xml; charset=utf-8" };

///////////////////////////////////////////
// Function: searchByISBN
// Not actually used for current set of libs
// Maybe one day...
///////////////////////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = { service: lib.Name, availability: [], start: new Date() };
    var handleError = function (error) {
        responseHoldings.error = error;
        responseHoldings.end = new Date();
        callback(responseHoldings);
    };

    // Request 1: web service to search for item
    request.get({ url: lib.Url + searchUrl + isbn, headers: reqHeader }, function (error, msg, response) {
        if (error) {
            handleError(error);
        } else {
            xml2js.parseString(response, function (err, res) {
                if (res.searchCatalog.TotalCount[0] > 0) {
                    var bibId = res.searchCatalog.Bib[0].BcId[0];
                    // Request 2: web service to get availability
                    request.get({ url: lib.Url + 'currentItems/' + bibId, headers: reqHeader }, function (error, msg, response) {
                        if (error) {
                            handleError(error);
                        } else {
                            xml2js.parseString(response, function (err, result) {
                                var libs = {};
                                result.CurrentItems.LibraryItem.forEach(function (item) {
                                    var libName = item.Branch[0].Name[0];
                                    if (!libs[libName]) libs[libName] = { available: 0, unavailable: 0 };
                                    item.Status[0] == 'UNAVAILABLE' ? libs[libName].unavailable++ : libs[libName].available++;
                                });
                                for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
                                responseHoldings.end = new Date();
                                callback(responseHoldings);
                            });
                        }
                    });
                } else {
                    responseHoldings.end = new Date();
                    callback(responseHoldings);
                }
            });
        }
    });
};