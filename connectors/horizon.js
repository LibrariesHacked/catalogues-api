///////////////////////////////////////////
// HORIZON
// 
///////////////////////////////////////////
console.log('horizon connector loading...');

///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and cheerio for 
// converting querying HTML.
///////////////////////////////////////////
var cheerio = require('cheerio'),
    request = require('request'),
    common = require('../connectors/common');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////
var catUrl = 'ipac20/ipac.jsp?menu=search&index=ISBNEX&term=';
var libsUrl = 'ipac20/ipac.jsp?menu=search&submenu=subtab14';

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

    // Request 1: Get advanced search page
    request.get({ url: service.Url + libsUrl, timeout: 30000 }, function (error, message, response) {
        if (common.handleErrors(callback, responseLibraries, error, message)) return;
        $ = cheerio.load(response);
        $('select[name=limitbox_1] option').each(function () {
            if ($(this).text().indexOf('Exclude') == -1) responseLibraries.libraries.push($(this).text().replace('Loc: ', ''));
        });
        common.completeCallback(callback, responseLibraries);
    });
};

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = { service: lib.Name, availability: [], start: new Date() };

    // Request 1: Use the item deep link URL
    request.get({ url: lib.Url + catUrl + isbn, timeout: 60000 }, function (error, msg, response) {
        if (common.handleErrors(callback, responseHoldings, error, msg)) return;
        var libs = {};
        $('table.bibItems tr.bibItemsEntry').each(function (index, elem) {
            var name = $(this).find('td').eq(0).text().trim();
            var status = $(this).find('td').eq(2).text().trim();
            if (!libs[name]) libs[name] = { available: 0, unavailable: 0 };
            lib.Available.indexOf(status) != -1 ? libs[name].available++ : libs[name].unavailable++;
        });
        for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
        common.completeCallback(callback, responseHoldings);
    });
};