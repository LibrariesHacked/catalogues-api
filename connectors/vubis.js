////////////////////
// Requires
////////////////////
var request = require('request'),
    cheerio = require('cheerio');
console.log('vubis connector loading');

//////////////////////////
// Function: searchByISBN
// This is a horrible chain of requests.  Particularly as the data returned is always within 
// framesets (so you need to get the url from the relevant frame).
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = [];
    var url = lib.Url + 'List.csp?Index1=Keywords&Database=1&Location=NoPreference&Language=NoPreference&PublicationType=NoPreference&OpacLanguage=eng&NumberToRetrieve=50&SearchMethod=Find_1&SearchTerm1=' + isbn + '&Profile=Default&PreviousList=Start&PageType=Start&WebPageNr=1&WebAction=NewSearch&StartValue=1&RowRepeat=0&MyChannelCount=&SearchT1=' + isbn;
    // Request 1: Get the frameset (*vomits*)
    request.get({ url: url }, function (error, msg, response) {
        $ = cheerio.load(response);
        // Request 2:
        request.get({ url: lib.Url + $('frame').eq(1).attr('src') }, function (error, msg, response) {
            $ = cheerio.load(response);
            //Request 3:
            request.get({ url: lib.Url + $('td.listitemOdd').last().find('a').attr('href').trim() }, function (error, msg, response) {
                $ = cheerio.load(response);
                // Request 4: 
                request.get({ url: lib.Url + $('frame').eq(1).attr('src') }, function (error, msg, response) {
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
            });
        });
    });
};