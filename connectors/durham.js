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
    var handleError = function (error) {
        if (error) {
            responseHoldings.error = error;
            responseHoldings.end = new Date();
            callback(responseHoldings);
            return true;
        }
    };

    // Request 1: initialise the session - go to home page.
    request.get({ url: lib.Url, timeout: 10000, jar: true }, function (error, message, response) {
        if (handleError(error)) return;
        // Request 2: Enter the library catalogue as a guest
        request.post({ url: lib.Url + 'pgLogin.aspx?CheckJavascript=1', jar: true, timeout: 10000 }, function (error, message, response) {
            if (handleError(error)) return;
            // Request 3: Go to catalogue page
            request.post({ url: lib.Url + 'pgCatKeywordSearch.aspx', jar: true, timeout: 10000 }, function (error, message, response) {
                if (handleError(error)) return;
                var headers = {
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
                $ = cheerio.load(response);
                var viewstate = $('input[name=__VIEWSTATE]').val();
                var viewstategenerator = $('input[name=__VIEWSTATEGENERATOR]').val();
                var eventValidation = $('input[name=__EVENTVALIDATION]').val();
                var aspNetForm = {
                    __VIEWSTATE: viewstate,
                    __VIEWSTATEGENERATOR: viewstategenerator,
                    __EVENTVALIDATION: eventValidation,
                    ctl00$cph1$cbBooks: 'on',
                    ctl00$cph1$Keywords: isbn,
                    ctl00$cph1$btSearch: 'Search'
                };

                // Request 4: postback the page.
                request.post({ url: lib.Url + 'pgCatKeywordSearch.aspx', gzip: true, form: aspNetForm, jar: true, headers: headers, timeout: 10000 }, function (error, message, response) {
                    if (handleError(error)) return;

                    // Request 5: 
                    request.get({ url: lib.Url + message.headers.location, gzip: true, jar: true, headers: headers, timeout: 10000 }, function (error, message, response) {
                        if (handleError(error)) return;
                        console.log(response);
                        // That should bring back the results list.

                        $ = cheerio.load(response);
                        $('#ct100_cph1_lvResults_ctr10_lnkbtnTitle')

                        // Request 6: 


                        responseHoldings.end = new Date();
                        callback(responseHoldings);
                    });
                });
            });
        });
    });
};