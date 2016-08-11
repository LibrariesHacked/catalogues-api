///////////////////////////////////////////
// IBISTRO
// 
///////////////////////////////////////////
console.log('ibistro connector loading...');

///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and cheerio for
// querying the HTML returned.
///////////////////////////////////////////
var request = require('request'),
    cheerio = require('cheerio'),
    common = require('../connectors/common');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////

///////////////////////////////////////////
// Function: getService
///////////////////////////////////////////
exports.getService = function (svc, callback) {
    var service = common.getService(svc);
    service.CatalogueUrl = svc.Url + svc.Home;
    callback(service);
};

///////////////////////////////////////////
// Function: getLibraries
///////////////////////////////////////////
exports.getLibraries = function (service, callback) {
    var responseLibraries = { service: service.Name, libraries: [], start: new Date() };
    // Request 1: Get advanced search page
    request.get({ url: service.Url + service.Home, timeout: 60000 }, function (error, message, response) {
        if (common.handleErrors(callback, responseLibraries, error, message)) return;
        $ = cheerio.load(response);
        $('#library option').each(function () {
            if ($(this).text().indexOf('ALL') == -1 && $(this).text().indexOf('HERE') == -1) responseLibraries.libraries.push($(this).text());
        });
        common.completeCallback(callback, responseLibraries);
    });
};

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = { service: lib.Name, availability: [], start: new Date() };

    // Declare this for use later on depending on search results.
    var getAvailability = function (itemPage) {
        $ = cheerio.load(itemPage);
        var libs = {};
        var currentLib = '';
        $('tr').each(function (index, elem) {
            var libr = $(this).find('td.holdingsheader,th.holdingsheader').eq(0).text().trim();
            if (libr == 'Copies') libr = $(this).find('.holdingsheader_users_library').eq(0).text().trim();

            var status = $(this).find('td').eq(3).text().trim();
            if (libr) {
                currentLib = libr;
            } else {
                if (currentLib && status) {
                    if (!libs[currentLib]) libs[currentLib] = { available: 0, unavailable: 0 };
                    lib.Available.indexOf(status) > -1 ? libs[currentLib].available++ : libs[currentLib].unavailable++;
                }
            }
        });
        for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
        common.completeCallback(callback, responseHoldings);
    };

    // Request 1: 
    request.get({ url: lib.Url + lib.Search + isbn, timeout: 30000 }, function (error, msg, response) {
        if (common.handleErrors(callback, responseHoldings, error, msg)) return;
        $ = cheerio.load(response);
        // Could be multiple copies held - check for a hitlist form
        if ($('form[name=hitlist]').length > 0) {
            // By default we'll get the first item - will probably extend this to loop through and get them all.
            var url = msg.request.uri.protocol + '//' + msg.request.uri.host + $('form[name=hitlist]').attr('action');
            // Request 2: 
            request.post({ url: url, body: "first_hit=1&form_type=&last_hit=2&VIEW%5E1=Details", timeout: 30000 }, function (error, message, response) {
                if (common.handleErrors(callback, responseHoldings, error, message)) return;
                getAvailability(response);
            });
        } else {
            getAvailability(response);
        }
    });
};