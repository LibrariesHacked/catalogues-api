///////////////////////////////////////////
// VIEWPOINT2
// 
///////////////////////////////////////////
console.log('viewpoint2 connector loading...');

///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls)
///////////////////////////////////////////
var request = require('request'),
    cheerio = require('cheerio'),
    common = require('../connectors/common');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////
var searchUrl = '?enqtype=ISBNQUERY&authpara1=';

///////////////////////////////////////////
// Function: getService
///////////////////////////////////////////
exports.getService = function (svc, callback) {
    var service = common.getService(svc);
    callback(service);
};

///////////////////////////////////////////
// Function: getLibraries
///////////////////////////////////////////
exports.getLibraries = function (service, callback) {
    var responseLibraries = { service: service.Name, libraries: [], start: new Date() };

    // Request 1: There's no obvious listing of libraries or search filter.  Just get a record where we know it has lots of copies
    request.get({ url: service.Url + '?enqtype=SECOND&enqpara1=RESULT&rcn=' + service.TestRCN, timeout: 30000 }, function (error, message, response) {
        if (common.handleErrors(callback, responseLibraries, error, message)) return;
        // Now parse through the availability table
        $ = cheerio.load(response);
        var libs = {};
        $('table.viewpointdisplaybottomavailablebox tr').slice(1).each(function (row) {
            var name = $(this).find('td').eq(0).text().trim();
            if (!libs[name]) libs[name] = name;
        });
        for (var l in libs) responseLibraries.libraries.push(l);
        common.completeCallback(callback, responseLibraries);
    });
};

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = { service: lib.Name, availability: [], start: new Date() };

    // Request 1: Perform the search.
    request.get({ url: lib.Url + searchUrl + isbn, timeout: 30000 }, function (error, message, response) {
        if (common.handleErrors(callback, responseHoldings, error, message)) return;
        $ = cheerio.load(response);
        // Get the more details link - ah some more horrific code :-)
        var moreDetails = null;
        $('a').each(function () {
            if ($(this).attr('href') && $(this).attr('href').indexOf('enqpara1=RESULT&rcn=') != -1) moreDetails = $(this).attr('href');
        });

        // Nothing found - return.
        if (!moreDetails) {
            common.completeCallback(callback, responseHoldings);
            return;
        }

        // Request 2: Return the item details.
        request.get({ url: moreDetails, timeout: 30000 }, function (error, message, response) {
            if (common.handleErrors(callback, responseHoldings, error, message)) return;
            // Now parse through the availability table
            $ = cheerio.load(response);
            var libs = {};
            $('table.viewpointdisplaybottomavailablebox tr').slice(1).each(function (row) {
                var name = $(this).find('td').eq(0).text().trim();
                var status = $(this).find('td').eq(2).text().trim();
                if (!libs[name]) libs[name] = { available: 0, unavailable: 0 };
                status == lib.Available ? libs[name].available++ : libs[name].unavailable++;
            });
            for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
            responseHoldings.end = new Date();
            common.completeCallback(callback, responseHoldings);
        });
    });
};