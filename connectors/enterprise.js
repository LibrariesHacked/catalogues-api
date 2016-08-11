///////////////////////////////////////////
// ENTERPRISE
// 
///////////////////////////////////////////
console.log('enterprise connector loading...');

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
var searchUrl = 'search/results?qu=';
var itemUrl = 'search/detailnonmodal/ent:[ILS]/one';
var header1 = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Safari/537.36 Edge/13.10586' };
var header2 = { 'X-Requested-With': 'XMLHttpRequest' };

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
    request.get({ url: service.Url + 'search/advanced', timeout: 30000 }, function (error, message, response) {
        if (common.handleErrors(callback, responseLibraries, error, message)) return;
        $ = cheerio.load(response);
        $('#libraryDropDown option').each(function () {
            if ($(this).text() != 'Any Library') responseLibraries.libraries.push($(this).text());
        });
        common.completeCallback(callback, responseLibraries);
    });
};

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = { service: lib.Name, availability: [], start: new Date() };

    // Function to get availability - called either immediately (if redirected onto the main item page)
    // Or after a second request to go to the item page.
    var getItemAvailability = function (ils, itemPage) {

        if (ils.indexOf('SD_ILS') == -1) {
            common.completeCallback(callback, responseHoldings);
            return;
        }

        var url = lib.Url + lib.AvailabilityUrl + ils.split('/').join('$002f');
        // Request: A post request returns the data used to show the availability information
        request.post({ url: url, headers: header2, timeout: 30000 }, function (error, msg, resp2) {
            if (common.handleErrors(callback, responseHoldings, error, msg)) return;
            if (!common.isJsonString(resp2)) {
                common.completeCallback(callback, responseHoldings);
                return;
            }
            var avail = JSON.parse(resp2);
            $ = cheerio.load(itemPage);
            var libs = {};
            $('.detailItemsTableRow').each(function (index, elem) {
                var name = $(this).find('td').eq(0).text().trim();
                var bc = $(this).find('td div').attr('id').replace('availabilityDiv', '');
                // The status search can go down (while item details are still returned.  in this case just have to bail out.
                // -- should in future be able to return a bit more info
                if (avail.ids && avail.ids.length > 0) {
                    var status = avail.strings[avail.ids.indexOf(bc)].trim();
                    if (!libs[name]) libs[name] = { available: 0, unavailable: 0 };
                    lib.Available.indexOf(status) > 0 ? libs[name].available++ : libs[name].unavailable++;
                }
            });
            for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
            common.completeCallback(callback, responseHoldings);
        });
    };

    // Request 1: Call the deep link to the item by ISBN
    request.get({ url: lib.Url + searchUrl + isbn, headers: header1, timeout: 30000 }, function (error, msg, resp1) {
        if (common.handleErrors(callback, responseHoldings, error, msg)) return;
        var uri = msg.request.uri.path;
        var ils = uri.substring(uri.lastIndexOf("ent:") + 4, uri.lastIndexOf("/one"));
        // Bail out here if we don't get back an ID.
        if (!ils) {
            common.completeCallback(callback, responseHoldings);
            return;
        }

        if (ils == '/cl') {
            // In this situation need to call the item page.
            ils = null;
            $ = cheerio.load(resp1);
            if ($('#da0').attr('value')) ils = $('#da0').attr('value').substring($('#da0').attr('value').lastIndexOf("ent:") + 4);
            // Get the item page
            if (ils != null) {
                request.get({ url: lib.Url + itemUrl.replace('[ILS]', ils.split('/').join('$002f')), timeout: 30000 }, function (error, message, response) {
                    if (common.handleErrors(callback, responseHoldings, error, message)) return;
                    getItemAvailability(ils, response);
                });
            } else {
                common.completeCallback(callback, responseHoldings);
            }
        } else {
            getItemAvailability(ils, resp1);
        }
    });
};