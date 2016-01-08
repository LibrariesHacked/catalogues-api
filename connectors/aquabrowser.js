console.log('aquabrowser connector loading...');

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
var searchUrl = 'result.ashx?output=xml&q=';
var itemUrl = 'availability.ashx?output=xml&hreciid=';

///////////////////////////////////////////
// Function: searchByISBN
// Aquabrowser returns XML, firstly from a control to search
// for the ID, then to get availability.
///////////////////////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = { service: lib.Name, availability: [], start: new Date() };
    var handleError = function (error) {
        if (error) {
            responseHoldings.error = error;
            responseHoldings.end = new Date();
            callback(responseHoldings);
            return true;
        }
    };

    // Request 1: call the search control for the ISBN
    request.get({ url: lib.Url + searchUrl + isbn, timeout: 10000 }, function (error, msg, response) {
        if (handleError(error)) return;
        xml2js.parseString(response, function (err, res) {
            if (handleError(err)) return;
            if (res.root.results && res.root.results[0].record) {
                // Request 2: call the availability control for the record Id
                request.get({ url: lib.Url + itemUrl + res.root.results[0].record[0].$.extID, timeout: 10000 }, function (error, msg, response) {
                    if (handleError(error)) return;
                    xml2js.parseString(response, function (err, res) {
                        if (handleError(err)) return;
                        var libs = {};
                        res.root.vubissmartmarcavail[0].loc.forEach(function (item) {
                            var libName = item.$.loc;
                            if (!libs[libName]) libs[libName] = { available: 0, unavailable: 0 };
                            item.$.available == "true" ? libs[libName].available++ : libs[libName].unavailable++;
                        });
                        for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
                        responseHoldings.end = new Date();
                        callback(responseHoldings);
                    });
                });
            } else {
                responseHoldings.end = new Date();
                callback(responseHoldings);
            }
        });
    });
};