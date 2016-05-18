///////////////////////////////////////////
// AQUABROWSER
// 
///////////////////////////////////////////
console.log('aquabrowser connector loading...');

///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and xml2js for 
// converting xml response to JSON
///////////////////////////////////////////
var xml2js = require('xml2js'),
    request = require('request'),
    common = require('../connectors/common');

///////////////////////////////////////////
// AQUA VARIABLES
///////////////////////////////////////////
var searchUrl = 'result.ashx?output=xml&q=';
var itemUrl = 'availability.ashx?output=xml&hreciid=';
var libsUrl = 'result.ashx?inlibrary=false&noext=false&uilang=en&searchmode=assoc&skin=barnet&c_over=1&i_fk=&mxdk=-1&curpage=1&cmd=find&output=xml';

///////////////////////////////////////////
// Function: getService
///////////////////////////////////////////
exports.getService = function (svc, callback) {
    var service = common.getService(svc);
    callback(service);
};

///////////////////////////////////////////
// Function: getLibraries
// For Aquabrowser just need to launch the search page
// and then parse back the library select
///////////////////////////////////////////
exports.getLibraries = function (service, callback) {
    var responseLibraries = { service: service.Name, libraries: [], start: new Date() };

    // Request 1: Call a basic search which should return XML with the branch filter.
    request.get({ url: service.Url + libsUrl, timeout: 60000 }, function (error, msg, response) {
        if(common.handleErrors(callback, responseLibraries, error, msg)) return;
        xml2js.parseString(response, function (err, res) {
            if (common.handleErrors(callback, responseLibraries, err)) return;
            var sel = res.root.branchselection;
            if (sel && sel[0] && sel[0].navoptions) {
                sel[0].navoptions[0].opt.forEach(function (item) {
                    if (item.$.val != '' && item.$.val != 'Unavailable') responseLibraries.libraries.push(item.$.val);
                });
            }
            common.completeCallback(callback, responseLibraries);
        });
    });
};

///////////////////////////////////////////
// Function: searchByISBN
// Aquabrowser returns XML, firstly from a control to search
// for the ID, then to get availability.
///////////////////////////////////////////
exports.searchByISBN = function (isbn, service, callback) {
    var responseHoldings = { service: service.Name, availability: [], start: new Date() };

    // Request 1: call the search control for the ISBN
    request.get({ url: service.Url + searchUrl + isbn, timeout: 30000 }, function (error, msg, response) {
        if (common.handleErrors(callback, responseHoldings, error, msg)) return;
        xml2js.parseString(response, function (err, res) {
            if (common.handleErrors(callback, responseHoldings, err)) return;
            if (res.root.results && res.root.results[0].record) {
                // Request 2: call the availability control for the record Id
                request.get({ url: service.Url + itemUrl + res.root.results[0].record[0].$.extID, timeout: 30000 }, function (error, msg, response) {
                    if (common.handleErrors(callback, responseHoldings, error, msg)) return;
                    xml2js.parseString(response, function (err, res) {
                        if (common.handleErrors(callback, responseHoldings, err)) return;
                        var libs = {};
                        if (res.root.vubissmartmarcavail[0].loc) {
                            res.root.vubissmartmarcavail[0].loc.forEach(function (item) {
                                var libName = item.$.loc;
                                if (!libs[libName]) libs[libName] = { available: 0, unavailable: 0 };
                                item.$.available == "true" ? libs[libName].available++ : libs[libName].unavailable++;
                            });
                        }
                        for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
                        common.completeCallback(callback, responseHoldings);
                    });
                });
            } else {
                common.completeCallback(callback, responseHoldings);
            }
        });
    });
};