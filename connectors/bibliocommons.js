///////////////////////////////////////////
// BIBLIOCOMMONS
// 
///////////////////////////////////////////
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
// Function: getService
///////////////////////////////////////////
exports.getService = function (svc, callback) {
    var service = common.getService(svc);
    callback(service);
};

///////////////////////////////////////////
// Function: searchByISBN
// Not actually used for current set of libs
// Maybe one day...
///////////////////////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = { service: lib.Name, code: lib.Code, availability: [], start: new Date(), url: lib.Url + searchUrl + isbn };

    var handleSearchRequest = function (error, msg, response) {
        if (common.handleErrors(callback, responseHoldings, error, msg)) return;
        xml2js.parseString(response, parseSearchResult);
    };

    var parseSearchResult = function (err, res) {
        if (common.handleErrors(callback, responseHoldings, err)) return;
        if (res.searchCatalog.TotalCount[0] == 0) { common.completeCallback(callback, responseHoldings); return; }
        var bibId = res.searchCatalog.Bib[0].BcId[0];
        request.get({ url: lib.Url + 'currentItems/' + bibId, headers: reqHeader, timeout: 30000 }, handleAvailabilityRequest);
    };

    var handleAvailabilityRequest = function (error, msg, response) {
        if (common.handleErrors(callback, responseHoldings, error, msg)) return;
        xml2js.parseString(response, parseAvailability);
    };

    var parseAvailability = function (err, result) {
        if (common.handleErrors(callback, responseHoldings, err)) return;
        var libs = {};
        result.CurrentItems.LibraryItem.forEach(function (item) {
            var libName = item.Branch[0].Name[0];
            if (!libs[libName]) libs[libName] = { available: 0, unavailable: 0 };
            item.Status[0] == 'UNAVAILABLE' ? libs[libName].unavailable++ : libs[libName].available++;
        });
        for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
        common.completeCallback(callback, responseHoldings);
    };

    // Request 1: web service to search for item
    request.get({ url: responseHoldings.url, headers: reqHeader, timeout: 30000 }, handleSearchRequest);
};