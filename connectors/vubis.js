console.log('vubis connector loading');

///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and cheerio for 
// querying HTML
///////////////////////////////////////////
var request = require('request'),
    cheerio = require('cheerio');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////
var searchUrl = 'List.csp?Index1=Keywords&Database=1&Location=NoPreference&Language=NoPreference&PublicationType=NoPreference&OpacLanguage=eng&NumberToRetrieve=50&SearchMethod=Find_1&SearchTerm1=[ISBN]&Profile=Default&PreviousList=Start&PageType=Start&WebPageNr=1&WebAction=NewSearch&StartValue=1&RowRepeat=0&MyChannelCount=&SearchT1=';
//////////////////////////
// Function: searchByISBN
// This is a horrible chain of requests.  Particularly as the data returned is always within 
// framesets (framesets!) (so you need to get the url from the relevant frame).
// Probably can do all this from a single call - will investigate
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {

    var responseHoldings = [];
    // Kick off a session
    request.get(lib.Url + 'vubis.csp', function (error, message, response) {
        $ = cheerio.load(response);
        var link = $('frame').eq(1).attr('src');
        request.get(lib.Url + link, function (error, message, response) {
            $ = cheerio.load(response);
            var link = $('frame').eq(1).attr('src');
            var enc = $('input[name=EncodedRequest]').attr('value');
            var url = lib.Url + searchUrl.replace('[ISBN]', isbn) + isbn + '&EncodedRequest=' + enc;

            // Request 1: Get the search frameset (*voms*)
            request.get({ url: url }, function (error, msg, response) {

                // Also horrible code, but declaring this here to use later on
                var itemRequest = function (link) {
                    request.get({ url: link }, function (error, msg, response) {
                        var libs = {};
                        $ = cheerio.load(response);
                        $('table[summary="FullBB.HoldingDetails"] tr').slice(2).each(function () {
                            var status = $(this).find('td').eq(3).text().trim();
                            var name = $(this).find('td').eq(1).text().trim();
                            if (!libs[name]) libs[name] = { available: 0, unavailable: 0 };
                            status == 'Available' ? libs[name].available++ : libs[name].unavailable++;
                        });
                        for (var l in libs) responseHoldings.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
                        callback(responseHoldings);
                    });
                };

                $ = cheerio.load(response);
                // In some (but not all) cases this will redirect to the relevant item page
                var link = $('frame').eq(1).attr('src');
                if (link && link.indexOf('ListBody') != -1) {
                    request.get({ url: lib.Url + link }, function (error, msg, response) {
                        $ = cheerio.load(response);
                        var link = $('td.listitemOdd').last().find('a');
                        if (link.text().trim() == 'Available') {
                            request.get(lib.Url + link.attr('href'), function (error, message, response) {
                                $ = cheerio.load(response);
                                var link = $('frame').eq(1).attr('src');
                                itemRequest(lib.Url + link);
                            });
                        } else {
                            callback(responseHoldings);
                        }
                    });
                } else if (link && link.indexOf('FullBBBody') != -1) {
                    itemRequest(lib.Url + link);
                } else {
                    callback(responseHoldings);
                }
            });
        });
    });
};