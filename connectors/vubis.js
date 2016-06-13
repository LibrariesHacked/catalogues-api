///////////////////////////////////////////
// VUBIS
// 
///////////////////////////////////////////
console.log('vubis connector loading');

///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and cheerio for 
// querying HTML
///////////////////////////////////////////
var request = require('request'),
    cheerio = require('cheerio'),
    common = require('../connectors/common');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////
var searchUrl = 'List.csp?Index1=Isbn&Database=1&Location=NoPreference&Language=NoPreference&PublicationType=NoPreference&OpacLanguage=eng&NumberToRetrieve=50&SearchMethod=Find_1&SearchTerm1=[ISBN]&Profile=Default&PreviousList=Start&PageType=Start&WebPageNr=1&WebAction=NewSearch&StartValue=1&RowRepeat=0&MyChannelCount=&SearchT1=';
var home = 'vubis.csp';

///////////////////////////////////////////
// Function: getService
///////////////////////////////////////////
exports.getService = function (svc, callback) {
    var service = common.getService(svc);
    service.CatalogueUrl = svc.Url + home;
    callback(service);
};

///////////////////////////////////////////
// Function: getLibraries
///////////////////////////////////////////
exports.getLibraries = function (service, callback) {
    var responseLibraries = { service: service.Name, libraries: [], start: new Date() };

    var url = service.Url + 'Vubis.csp?Profile=' + service.Profile + '&SearchMethod=Find_2';
    // Request 1. This gets the frameset
    request.get({ url: url, timeout: 30000 }, function (error, message, response) {
        if (common.handleErrors(callback, responseLibraries, error, message)) return;
        $ = cheerio.load(response);
        var link = $('FRAME[Title="Vubis.Body"]').attr('src');
        // Request 2. Get the internal body page.
        request.get({ url: service.Url + link, timeout: 30000 }, function (error, message, response) {
            if (common.handleErrors(callback, responseLibraries, error, message)) return;
            $ = cheerio.load(response);

            if ($('select[name=Location] option').length > 0) {
                $('select[name=Location] option').each(function () {
                    if ($(this).text().trim() != 'No preference' && $(this).text().trim() != 'All options') responseLibraries.libraries.push($(this).text().trim());
                });
                common.completeCallback(callback, responseLibraries);
            } else {
                var link = $("a:contains('Advanced Search')").attr('href');
                // Request 3: Get the internal body page.
                request.get({ url: service.Url + link, timeout: 30000 }, function (error, message, response) {
                    if (common.handleErrors(callback, responseLibraries, error, message)) return;
                    $ = cheerio.load(response);
                    var link = $('FRAME[Title="Vubis.Body"]').attr('src');
                    // Request 4: 
                    request.get({ url: service.Url + link, timeout: 30000 }, function (error, message, response) {
                        if (common.handleErrors(callback, responseLibraries, error, message)) return;
                        $ = cheerio.load(response);
                        $('select[name=Location] option').each(function () {
                            if ($(this).text().trim() != 'No preference' && $(this).text().trim() != 'All options') responseLibraries.libraries.push($(this).text().trim());
                        });
                        common.completeCallback(callback, responseLibraries);
                    });
                });
            }
        });
    });
};

///////////////////////////////////////////
// Function: getWebsite
///////////////////////////////////////////
exports.getWebsite = function (service, callback) {
    callback({ service: service.Name, website: service.Url + home, https: (service.Url.indexOf('https') != -1) })
};

///////////////////////////////////////////
// Function: searchByISBN
// This is a horrible chain of requests.  Particularly as the data returned is always within 
// framesets (in 2016!) - so you need to get the URL for the relevant frame.
// Probably can do all this from a single call - will investigate
///////////////////////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = { service: lib.Name, availability: [], start: new Date() };

    // Declaring this function to use later on
    var itemRequest = function (link) {
        // Request 6: Get the item availability.
        request.get({ url: link, timeout: 20000 }, function (error, msg, response) {
            if (common.handleErrors(callback, responseHoldings, error, msg)) return;
            var libs = {};
            $ = cheerio.load(response);
            var availIndex = $('table[summary="FullBB.HoldingDetails"] tr').eq(1).find(':contains(Availability)').index();
            var shelfMarkIndex = $('table[summary="FullBB.HoldingDetails"] tr').eq(1).find(':contains(Shelfmark)').index();
            $('table[summary="FullBB.HoldingDetails"] tr').slice(2).each(function () {
                var status = $(this).find('td').eq(availIndex).text().trim();
                var name = $(this).find('td').eq(shelfMarkIndex).text().trim();
                if (name.indexOf(':') != -1) name = name.split(':')[0];
                if (name.indexOf('/') != -1) name = name.split('/')[0];
                if (!libs[name]) libs[name] = { available: 0, unavailable: 0 };
                status == 'Available' ? libs[name].available++ : libs[name].unavailable++;
            });
            for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
            common.completeCallback(callback, responseHoldings);
        });
    };

    // Request 1: Kick off a session
    request.get({ url: lib.Url + 'Vubis.csp', timeout: 20000 }, function (error, message, response) {
        if (common.handleErrors(callback, responseHoldings, error, message)) return;
        $ = cheerio.load(response);
        var link = $('FRAME[Title="Vubis.Body"]').attr('src');
        // Request 2: Should now have the StartBody link - do it!
        request.get({ url: lib.Url + link, timeout: 20000 }, function (error, message, response) {
            if (common.handleErrors(callback, responseHoldings, error, message)) return;
            $ = cheerio.load(response);
            // Get the encoded value to perform the search.
            var enc = $('input[name=EncodedRequest]').attr('value');
            var url = lib.Url + searchUrl.replace('[ISBN]', isbn) + isbn + '&EncodedRequest=' + enc;
            // Request 3: Get the search frameset (*voms*)
            request.get({ url: url, timeout: 20000 }, function (error, msg, response) {
                if (common.handleErrors(callback, responseHoldings, error, message)) return;
                $ = cheerio.load(response);
                // In some (but not all) cases this will redirect to the relevant item page
                var link = $('FRAME[title="List.Body"]').attr('src');
                if (!link || link.indexOf('ListBody') == -1) {
                    common.completeCallback(callback, responseHoldings);
                    return;
                }
                if (link.indexOf('FullBBBody') != -1) itemRequest(lib.Url + link);
                // Request 4:
                request.get({ url: lib.Url + link, timeout: 20000 }, function (error, msg, response) {
                    if (common.handleErrors(callback, responseHoldings, error, message)) return;
                    $ = cheerio.load(response);
                    var link = $('td.listitemOdd').last().find('a').attr('href');
                    if (!link) {
                        common.completeCallback(callback, responseHoldings);
                        return;
                    }
                    // Request 5:
                    request.get(lib.Url + link, function (error, message, response) {
                        //if (common.handleErrors(callback, responseHoldings, error, message)) return;
                        $ = cheerio.load(response);
                        var link = $('frame').eq(1).attr('src');
                        if (!link) {
                            common.completeCallback(callback, responseHoldings);
                            return;
                        }
                        var url = lib.Url + link.replace(lib.SubDir, '');
                        itemRequest(url);
                    });
                });
            });
        });
    });
};