console.log('durham connector loading...');

///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls)
///////////////////////////////////////////
var request = require('request'),
    cheerio = require('cheerio');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = { service: lib.Name, availability: [], start: new Date() };
    var headers = {
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/x-www-form-urlencoded'
    };
    var handleError = function (error) {
        if (error) {
            responseHoldings.error = error;
            responseHoldings.end = new Date();
            callback(responseHoldings);
            return true;
        }
    };

    // Function for getting the basic aspNetForm details for postbacks.
    var getAspNetForm = function (page) {
        var viewstate = '', viewstategenerator = '', eventValidation = '', aspNetForm = {};
        if (page('input[name=__VIEWSTATE]').val()) aspNetForm.__VIEWSTATE = page('input[name=__VIEWSTATE]').val();
        if (page('input[name=__VIEWSTATEGENERATOR]').val()) aspNetForm.__VIEWSTATEGENERATOR = page('input[name=__VIEWSTATEGENERATOR]').val();
        if (page('input[name=__EVENTVALIDATION]').val()) aspNetForm.__EVENTVALIDATION = page('input[name=__EVENTVALIDATION]').val();
        return aspNetForm;
    };

    // Request 1: Initialise the session - go to home page.
    request.get({ url: lib.Url, timeout: 20000, jar: true }, function (error, message, response) {
        if (handleError(error)) return;
        // Request 2: Enter the library catalogue as a guest
        request.post({ url: lib.Url + 'pgLogin.aspx?CheckJavascript=1', jar: true, timeout: 20000 }, function (error, message, response) {
            if (handleError(error)) return;
            // Request 3: Go to catalogue page
            request.post({ url: lib.Url + 'pgCatKeywordSearch.aspx', jar: true, timeout: 20000 }, function (error, message, response) {
                if (handleError(error)) return;
                $ = cheerio.load(response);
                var aspNetForm = getAspNetForm($);
                aspNetForm.ctl00$cph1$cbBooks = 'on';
                aspNetForm.ctl00$cph1$Keywords = isbn;
                aspNetForm.ctl00$cph1$btSearch = 'Search';
                var aspNetForm = {
                    __VIEWSTATE: $('input[name=__VIEWSTATE]').val(),
                    __VIEWSTATEGENERATOR: $('input[name=____VIEWSTATEGENERATOR]').val(),
                    __EVENTVALIDATION: $('input[name=__EVENTVALIDATION]').val(),
                    ctl00$cph1$lvResults$DataPagerEx2$ctl00$ctl00: 10,
                    ctl00$cph1$cbBooks:'on',
                    ctl00$cph1$Keywords:isbn,
                    ctl00$cph1$btSearch:'Search'
                };
                // Request 4: Perform the search.
                request.post({ url: lib.Url + 'pgCatKeywordSearch.aspx', gzip: true, form: aspNetForm, jar: true, headers: headers, timeout: 20000 }, function (error, message, response) {
                    if (handleError(error)) return;
                    // Request 5: Process the redirect that should be returned.
                    var resultLocation = message.headers.location;
                    request.get({ url: lib.Url + resultLocation, gzip: true, jar: true, headers: headers, timeout: 20000 }, function (error, message, response) {
                        if (handleError(error)) return;
                        // That should bring back the results list.
                        $ = cheerio.load(response);
                        if ($('#ct100_cph1_lvResults_ctr10_lnkbtnTitle')) {
                            var aspNetForm = {
                                __EVENTARGUMENT: '',
                                __EVENTTARGET: 'ctl00$cph1$lvResults$ctrl0$lnkbtnTitle',
                                __LASTFOCUS: '',
                                __VIEWSTATE: $('input[name=__VIEWSTATE]').val(),
                                __VIEWSTATEENCRYPTED: '',
                                __VIEWSTATEGENERATOR: $('input[name=____VIEWSTATEGENERATOR]').val(),
                                ctl00$cph1$lvResults$DataPagerEx2$ctl00$ctl00: 10
                            };
                            // Request 6: Get the item details
                            request.post({ url: lib.Url + resultLocation, gzip: true, form: aspNetForm, jar: true, headers: headers, timeout: 20000 }, function (error, message, response) {
                                if (handleError(error)) return;

                                // That returns a button to get the availability - very tedious!  Hit the button.
                                $ = cheerio.load(response);
                                var aspNetForm = {
                                    __EVENTARGUMENT: '',
                                    __EVENTTARGET: '',
                                    __LASTFOCUS: '',
                                    __VIEWSTATE: $('input[name=__VIEWSTATE]').val(),
                                    __VIEWSTATEENCRYPTED: '',
                                    __VIEWSTATEGENERATOR: $('input[name=____VIEWSTATEGENERATOR]').val(),
                                    ctl00$cph1$lvResults$DataPagerEx2$ctl00$ctl00: 10,
                                    ctl00$cph1$ucItem$lvTitle$ctrl0$btLibraryList: 'Libraries'
                                };
                                // Request 7: Get the item availability table
                                request.post({ url: lib.Url + resultLocation, gzip: true, form: aspNetForm, jar: true, headers: headers, timeout: 20000 }, function (error, message, response) {
                                    if (handleError(error)) return;
                                    $ = cheerio.load(response);
                                    var libs = {};
                                    $('table.viewgrid tr').slice(1).each(function () {
                                        var name = $(this).find('td').eq(0).text().trim();
                                        var status = $(this).find('td').eq(1).text().trim();
                                        if (!libs[name]) libs[name] = { available: 0, unavailable: 0 }
                                        status != 'Yes' ? libs[name].available++ : libs[name].unavailable++;
                                    });
                                    for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
                                    responseHoldings.end = new Date();
                                    callback(responseHoldings);
                                });
                            });
                        } else { // If it isn't listed then presumably it hasn't been found - exit.
                            responseHoldings.end = new Date();
                            callback(responseHoldings);
                        }
                    });
                });
            });
        });
    });
};