////////////////////
// Requires
////////////////////
var xml2js = require('xml2js');
var request = require('request');

/////////////
// Variables
////////////

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {

    var responseHoldings = [];
    // Request 2: call the search control for the ISBN
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
                            if (item.$.available  == "false") libraries[libName].unavailable++;
                            if (item.$.available == "true") libraries[libName].available++;
                        });

                        for (var lib in libraries) {
                            responseHoldings.push({ library: lib, available: libraries[lib].available, unavailable: libraries[lib].unavailable });
                        }

                        callback(responseHoldings);
                    });
                });
            } else {
                callback(responseHoldings);
            }
        });
    });
};