console.log('viewpoint3 connector loading...');

//////////////////////////
// Requires
//////////////////////////
var request = require('request'),
    cheerio = require('cheerio');

//////////////////////////
// Variables
//////////////////////////
var searchUrl = '02_Catalogue/02_004_TitleResults.aspx?page=1&searchType=5&searchTerm=';
var container = '#ctl00_ContentPlaceCenterContent_copyAvailabilityContainer';

///////////////////////////////////////////
// Function: getLibraries
///////////////////////////////////////////
exports.getLibraries = function (service, callback) {
    var responseLibraries = { service: service.Name, libs: [], start: new Date() };
    var handleError = function (error) {
        if (error) {
            responseLibraries.error = error;
            responseLibraries.end = new Date();
            callback(responseLibraries);
            return true;
        }
    };
    var reqStatusCheck = function (message) {
        if (message.statusCode != 200) {
            responseLibraries.error = "Web request error.";
            responseLibraries.end = new Date();
            callback(responseLibraries);
            return true;
        }
    };

    // Request 1: Get advanced search page
    request.get({ url: service.Url + 'advanced-search', timeout: 30000 }, function (error, message, response) {
	if (handleError(error)) return;
        if (reqStatusCheck(message)) return;
        responseLibraries.end = new Date();
        callback(responseLibraries);
    });
};

//////////////////////////
// Function: searchByISBN
//////////////////////////
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

    // Request 1: Deep link to the item by ISBN
    // Really wouldn't wanna use rejectUnauthorised for serious calls - query with Denbighshire about their certificate
    request.get({ url: lib.Url + searchUrl + isbn, rejectUnauthorized: false, timeout: 60000 }, function (error, msg, res) {
        if (handleError(error)) return;
        $ = cheerio.load(res);
        var libs = {};
        $(container).find('table tr').slice(1).each(function (i, elem) {
            var name = $(this).find('td').eq(0).text().trim();
            var status = $(this).find('td').eq(3).text().trim();
            if (!libs[name]) libs[name] = { available: 0, unavailable: 0 };
            status == '' ? libs[name].available++ : libs[name].unavailable++;
        });
        for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
        responseHoldings.end = new Date();
        callback(responseHoldings);
    });
};