///////////////////////////////////////////
// VIEWPOINT2
// 
///////////////////////////////////////////
console.log('viewpoint3 connector loading...');

//////////////////////////
// Requires
//////////////////////////
var request = require('request'),
    cheerio = require('cheerio'),
    common = require('../connectors/common');

//////////////////////////
// Variables
//////////////////////////
var searchUrl = '02_Catalogue/02_004_TitleResults.aspx?page=1&searchType=5&searchTerm=';
var advSearch = '02_Catalogue/02_002_AdvancedSearch.aspx';
var container = '#ctl00_ContentPlaceCenterContent_copyAvailabilityContainer';

///////////////////////////////////////////
// Function: getLibraries
///////////////////////////////////////////
exports.getLibraries = function (service, callback) {
    var responseLibraries = { service: service.Name, libraries: [], start: new Date() };

    // Request 1: Get advanced search page
    request.get({ url: service.Url + advSearch, rejectUnauthorized: false, timeout: 30000, jar: true }, function (error, message, response) {
        if (common.handleErrors(callback, responseLibraries, error, message)) return;
        
        $ = cheerio.load(response);
        var aspNetForm = {
            __EVENTARGUMENT: '',
            __EVENTTARGET: 'ctl00$ContentPlaceCenterContent$authorityLimit',
            __EVENTVALIDATION: $('input[name=__EVENTVALIDATION]').val(),
            __LASTFOCUS: '',
            __VIEWSTATE: $('input[name=__VIEWSTATE]').val(),
            __VIEWSTATEGENERATOR: $('input[name=____VIEWSTATEGENERATOR]').val(),
            ctl00$ContentPlaceCenterContent$authorityLimit: service.MultiAuthorityId,
            ctl00$ContentPlaceCenterContent$branchLimit: 0,
            ctl00$ContentPlaceCenterContent$languageLimit: 0,
            ctl00$ContentPlaceCenterContent$searchTerm: '',
            ctl00$ContentPlaceCenterContent$searchType: 0
        };

        // Request 2:
        request.post({ url: service.Url + advSearch, rejectUnauthorized: false, form: aspNetForm, timeout: 30000, jar: true }, function (error, message, response) {
            if (common.handleErrors(callback, responseLibraries, error, message)) return;
            $ = cheerio.load(response);
            $('select#ctl00_ContentPlaceCenterContent_branchLimit option').each(function () {
                if ($(this).text() != 'All libraries') responseLibraries.libraries.push($(this).text().trim());
            });
            common.completeCallback(callback, responseLibraries);
        });
    });
};

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = { service: lib.Name, availability: [], start: new Date() };

    // Request 1: Deep link to the item by ISBN
    // Really wouldn't want to disable rejectUnauthorised for production system - query with Denbighshire about their certificate
    request.get({ url: lib.Url + searchUrl + isbn, rejectUnauthorized: false, timeout: 60000 }, function (error, msg, res) {
        if (common.handleErrors(callback, responseHoldings, error, msg)) return;
        $ = cheerio.load(res);
        var libs = {};
        $(container).find('table tr').slice(1).each(function (i, elem) {
            var name = $(this).find('td').eq(0).text().trim();
            var status = $(this).find('td').eq(3).text().trim();
            if (!libs[name]) libs[name] = { available: 0, unavailable: 0 };
            status == '' ? libs[name].available++ : libs[name].unavailable++;
        });
        for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
        common.completeCallback(callback, responseHoldings);
    });
};