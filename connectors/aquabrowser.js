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

    var handleSearchResponse = function (error, msg, response) {
        if (common.handleErrors(callback, responseLibraries, error, msg)) return;
        xml2js.parseString(response, parseSearchResponse);
    };
    
    var parseSearchResponse = function (err, res) {
        if (common.handleErrors(callback, responseLibraries, err)) return;
        var branches = res.root.branchselection;
        if (branches && branches[0] && branches[0].navoptions) {
            branches[0].navoptions[0].opt.forEach(function (item) {
                if (item.$.val != '' && item.$.val != 'Unavailable') responseLibraries.libraries.push(item.$.val);
            });
        }
        common.completeCallback(callback, responseLibraries); return;
    };

    // Request 1: Call a basic search which should return XML with the branch filter.
    request.get({ url: service.Url + libsUrl, timeout: 60000 }, handleSearchResponse);
};

///////////////////////////////////////////
// Function: searchByISBN
// Aquabrowser returns XML, firstly from a control to search
// for the ID, then to get availability.
///////////////////////////////////////////
exports.searchByISBN = function (isbn, service, callback) {
    var responseHoldings = { service: service.Name, availability: [], start: new Date() };
 
    var handleSearchResponse = function (error, msg, response) {
        if (common.handleErrors(callback, responseHoldings, error, msg)) return;
        xml2js.parseString(response, parseSearchResponse);
    };
    
    var parseSearchResponse = function (err, res) {
        if (common.handleErrors(callback, responseHoldings, err)) return;
        var results = res.root.results;
        if (!results || !results[0].record) return common.completeCallback(callback, responseHoldings);
        // Request 2: call the availability control for the record Id
        request.get({ url: service.Url + itemUrl + results[0].record[0].$.extID, timeout: 30000 }, handleRecordResponse);
    };
    
    var handleRecordResponse = function (error, msg, response) {
        if (common.handleErrors(callback, responseHoldings, error, msg)) return;
        xml2js.parseString(response, parseRecordResponse);
    };
    
    var parseRecordResponse = function (err, res) {
        var avail = res.root.vubissmartmarcavail[0];
        if (common.handleErrors(callback, responseHoldings, err)) return;
        var libs = {};
        if (avail && avail.loc && avail.loc[0]) {
            avail.loc.forEach(function (item) {
                if (!libs[item.$.loc]) libs[item.$.loc] = { available: 0, unavailable: 0 };
                item.$.available == "true" ? libs[item.$.loc].available++ : libs[item.$.loc].unavailable++;
            });
        }
        for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
        common.completeCallback(callback, responseHoldings);
    };
    
    // Request 1: call the search control for the ISBN
    request.get({ url: service.Url + searchUrl + isbn, timeout: 30000 }, handleSearchResponse);
};