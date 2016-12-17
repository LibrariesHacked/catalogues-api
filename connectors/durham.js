///////////////////////////////////////////
// DURHAM
// 
///////////////////////////////////////////
console.log('durham connector loading...');

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

    var handleSessionRequest = function (error, message, response) {
        if (common.handleErrors(callback, responseLibraries, error, message)) return;
        request.post({ url: service.Url + 'pgLogin.aspx?CheckJavascript=1', jar: true, timeout: 20000 }, handleGuestRequest);
    };

    var handleGuestRequest = function (error, message, response) {
        if (common.handleErrors(callback, responseLibraries, error, message)) return;
        request.get({ url: service.Url + service.Libraries, timeout: 20000, jar: true }, handleLibraryPage);
    };

    var handleLibraryPage = function (error, message, response) {
        if (common.handleErrors(callback, responseLibraries, error, message)) return;
        $ = cheerio.load(response);
        $('ol.list-unstyled li').each(function () { responseLibraries.libraries.push($(this).text().trim()); });
        common.completeCallback(callback, responseLibraries);
    };

    // Request 1: Initialise the session - go to home page.
    request.get({ url: service.Url, timeout: 20000, jar: true }, handleSessionRequest);
};

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = { service: lib.Name, availability: [], start: new Date(), url: lib.Url };
    var resultLocation = '';
    var headers = {
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/x-www-form-urlencoded'
    };

    // Function for getting the basic aspNetForm details for postbacks.
    var getAspNetForm = function (page) {
        var viewstate = '', viewstategenerator = '', eventValidation = '', aspNetForm = {};
        if (page('input[name=__VIEWSTATE]').val()) aspNetForm.__VIEWSTATE = page('input[name=__VIEWSTATE]').val();
        if (page('input[name=__VIEWSTATEGENERATOR]').val()) aspNetForm.__VIEWSTATEGENERATOR = page('input[name=__VIEWSTATEGENERATOR]').val();
        if (page('input[name=__EVENTVALIDATION]').val()) aspNetForm.__EVENTVALIDATION = page('input[name=__EVENTVALIDATION]').val();
        return aspNetForm;
    };

    var handleSessionRequest = function (error, message, response) {
        if (common.handleErrors(callback, responseHoldings, error, message)) return;
        // Request 2: Enter the library catalogue as a guest
        request.post({ url: lib.Url + 'pgLogin.aspx?CheckJavascript=1', jar: true, timeout: 20000 }, handleGuestRequest);
    };

    var handleGuestRequest = function (error, message, response) {
        if (common.handleErrors(callback, responseHoldings, error, message)) return;
        // Request 3: Go to catalogue page
        request.post({ url: lib.Url + 'pgCatKeywordSearch.aspx', jar: true, timeout: 20000 }, handleCataloguePage);
    };

    var handleCataloguePage = function (error, message, response) {
        if (common.handleErrors(callback, responseHoldings, error, message)) return;
        $ = cheerio.load(response);
        var aspNetForm = getAspNetForm($);
        aspNetForm.ctl00$cph1$cbBooks = 'on';
        aspNetForm.ctl00$cph1$Keywords = isbn;
        aspNetForm.ctl00$cph1$btSearch = 'Search';
        var aspNetForm = {
            __VIEWSTATE: $('input[name=__VIEWSTATE]').val(),
            __VIEWSTATEGENERATOR: $('input[name=____VIEWSTATEGENERATOR]').val(),
            __EVENTVALIDATION: $('input[name=__EVENTVALIDATION]').val(),
            // ctl00$cph1$lvResults$DataPagerEx2$ctl00$ctl00: 10,
            ctl00$ctl00$cph1$cph2$cbBooks: 'on',
            ctl00$ctl00$cph1$cph2$Keywords: isbn,
            ctl00$ctl00$cph1$cph2$btSearch: 'Search'
        };
        // Request 4: Perform the search.
        request.post({ url: lib.Url + 'pgCatKeywordSearch.aspx', gzip: true, form: aspNetForm, jar: true, headers: headers, timeout: 20000 }, handleCatalogueSearch);
    };

    var handleCatalogueSearch = function (error, message, response) {
        if (common.handleErrors(callback, responseHoldings, error, message)) return;
        // Request 5: Process the redirect that should be returned.
        resultLocation = message.headers.location;
        request.get({ url: lib.Url + resultLocation, gzip: true, jar: true, headers: headers, timeout: 20000 }, handleResults);
    };

    var handleResults = function (error, message, response) {
        if (common.handleErrors(callback, responseHoldings, error, message)) return;
        // That should bring back the results list.
        $ = cheerio.load(response);
        
        if ($('#cph1_cph2_lvResults_lnkbtnTitle_0').length == 0) { common.completeCallback(callback, responseHoldings); return };
        var aspNetForm = {
            __EVENTARGUMENT: '',
            __EVENTTARGET: 'ctl00$ctl00$cph1$cph2$lvResults$ctrl0$lnkbtnTitle',
            __LASTFOCUS: '',
            __VIEWSTATE: $('input[name=__VIEWSTATE]').val(),
            __VIEWSTATEENCRYPTED: '',
            __VIEWSTATEGENERATOR: $('input[name=____VIEWSTATEGENERATOR]').val(),
            ctl00$ctl00$cph1$cph2$lvResults$DataPagerEx2$ctl00$ctl00: 10
        };
        // Request 6: Get the item details
        request.post({ url: lib.Url + resultLocation, gzip: true, form: aspNetForm, jar: true, headers: headers, timeout: 20000 }, handleItemDetails);
    };

    var handleItemDetails = function (error, message, response) {
        if (common.handleErrors(callback, responseHoldings, error, message)) return;
        // That returns a button to get the availability - very tedious!  Hit the button.
        $ = cheerio.load(response);
        var aspNetForm = {
            __EVENTARGUMENT: '',
            __EVENTTARGET: '',
            __EVENTVALIDATION: $('input[name=__EVENTVALIDATION]').val(),
            __LASTFOCUS: '',
            __VIEWSTATE: $('input[name=__VIEWSTATE]').val(),
            __VIEWSTATEENCRYPTED: '',
            __VIEWSTATEGENERATOR: $('input[name=____VIEWSTATEGENERATOR]').val(),
            ctl00$ctl00$cph1$cph2$lvResults$DataPagerEx2$ctl00$ctl00: 10,
            ctl00$ctl00$cph1$ucItem$lvTitle$ctrl0$btLibraryList: 'Libraries'
        };

        // Request 7: Get the item availability table
        request.post({ url: lib.Url + resultLocation, gzip: true, form: aspNetForm, jar: true, headers: headers, timeout: 20000 }, handleItemAvailability);
    };

    var handleItemAvailability = function (error, message, response) {
        if (common.handleErrors(callback, responseHoldings, error, message)) return;
        $ = cheerio.load(response);
        var libs = {};
        $('#cph1_ucItem_lvTitle2_lvLocation_0_itemPlaceholderContainer_0 table tr').slice(1).each(function () {
            var name = $(this).find('td').eq(0).text().trim();
            var status = $(this).find('td').eq(1).text().trim();
            if (!libs[name]) libs[name] = { available: 0, unavailable: 0 }
            status != 'Yes' ? libs[name].available++ : libs[name].unavailable++;
        });
        for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
        common.completeCallback(callback, responseHoldings);
    };


    // Request 1: Initialise the session - go to home page.
    request.get({ url: lib.Url, timeout: 20000, jar: true }, handleSessionRequest);
};