///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and xml2js for 
// converting xml response to JSON
///////////////////////////////////////////
var xml2js = require('xml2js'),
    request = require('request');
console.log('aquabrowser connector loading...');

///////////////////////////////////////////
// Function: searchByISBN
// Aquabrowser returns XML, firstly from a control to search
// for the ID, then to get availability.
///////////////////////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = [];
    // Request 1: call the search control for the ISBN
    request.get({ url: lib.Url + 'result.ashx?output=xml&q=' + isbn }, function (error, msg, response) {
        xml2js.parseString(response, function (err, res) {
            if (res.root.results && res.root.results[0].record) {
                // Request 2: call the availability control for the record Id
                request.get({ url: lib.Url + 'availability.ashx?output=xml&hreciid=' + res.root.results[0].record[0].$.extID }, function (error, msg, response) {
                    xml2js.parseString(response, function (err, res) {
                        var libraries = {};
                        res.root.vubissmartmarcavail[0].loc.forEach(function (item) {
                            var libName = item.$.loc;
                            if (!libraries[libName]) libraries[libName] = { available: 0, unavailable: 0 };
                            item.$.available == "true" ? libraries[libName].available++ : libraries[libName].unavailable++;
                        });
                        for (var l in libraries) responseHoldings.push({ library: l, available: libraries[l].available, unavailable: libraries[l].unavailable });
                        callback(responseHoldings);
                    });
                });
            } else {
                callback(responseHoldings);
            }
        });
    });
};