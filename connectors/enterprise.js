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
var headerPost = { 'X-Requested-With': 'XMLHttpRequest' };

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
    var responseLibraries = { service: service.Name, code: service.Code, libraries: [], start: new Date() };
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
    var responseHoldings = { service: lib.Name, code: lib.Code, availability: [], start: new Date(), url: lib.Url + searchUrl + isbn };
    var ils = '';
    var itemPage = '';

    // Function: deepLinkResponse
    var deepLinkResponse = function (error, msg, res) {
        if (common.handleErrors(callback, responseHoldings, error, msg)) return;
        ils = msg.request.uri.path.substring(msg.request.uri.path.lastIndexOf("ent:") + 4, msg.request.uri.path.lastIndexOf("/one")) || '';
        if (ils == '') { common.completeCallback(callback, responseHoldings); return; }
        itemPage = res;
        if (ils == '/cl') {
            // In this situation we're probably still on the search page (there may be duplicate results).
            $ = cheerio.load(itemPage);
            if ($('#da0').attr('value')) ils = $('#da0').attr('value').substring($('#da0').attr('value').lastIndexOf("ent:") + 4) || '';
            if (ils == '') { common.completeCallback(callback, responseHoldings); return; }
            var url = lib.Url + itemUrl.replace('[ILS]', ils.split('/').join('$002f'));
            request.get({ url: url, timeout: 30000 }, itemPageResponse);
        } else {
            // Availability information may already be part of the page.
            var matches = /parseDetailAvailabilityJSON\(([\s\S]*?)\)/.exec(itemPage);
            if (matches && matches[1] && common.isJsonString(matches[1])) {
                matchAvailabilityToLibraries(JSON.parse(matches[1]));
            } else {
                getItemAvailability(ils);
            }
        }
    };

    // Function: itemPageResponse
    var itemPageResponse = function (error, message, response) {
        if (common.handleErrors(callback, responseHoldings, error, message)) return;
        itemPage = response;
        getItemAvailability(ils);
    };

    // Function: getItemAvailability
    // Called either immediately (if redirected onto the main item page) or after a second request to go to the item page.
    var getItemAvailability = function (ils) {
        if (ils.indexOf('SD_ILS') == -1) return common.completeCallback(callback, responseHoldings);
        var url = lib.Url + lib.AvailabilityUrl.replace('[ITEMID]', ils.split('/').join('$002f'));
        // Request 2/3: A post request returns the data used to show the availability information
        request.post({ url: url, headers: headerPost, timeout: 30000 }, getFinalAvailabilityJson);
    };

    // Function: getFinalAvailabilityJson
    var getFinalAvailabilityJson = function (error, msg, res) {
        if (common.handleErrors(callback, responseHoldings, error, msg)) return;
        if (!common.isJsonString(res)) { common.completeCallback(callback, responseHoldings); return }
        var avail = JSON.parse(res);
        if (!avail.ids) {
            var titles = lib.Url + lib.TitleDetailUrl.replace('[ITEMID]', ils.split('/').join('$002f'));
            console.log(titles);
            request.post({ url: titles, headers: headerPost, timeout: 30000 }, getTitleDetailJson);
        } else {
            matchAvailabilityToLibraries(avail);
        }
    };

    // Function: matchAvailabilityToLibraries
    var matchAvailabilityToLibraries = function (avail) {
        $ = cheerio.load(itemPage);
        var libs = {};
        $('.detailItemsTableRow').each(function (index, elem) {
            var name = $(this).find('td').eq(0).text().trim();
            var bc = $(this).find('td div').attr('id').replace('availabilityDiv', '');
            if (bc && avail.ids && avail.ids.length > 0 && avail.strings && avail.ids.indexOf(bc) != -1) {
                var status = avail.strings[avail.ids.indexOf(bc)].trim();
                if (!libs[name]) libs[name] = { available: 0, unavailable: 0 };
                lib.Available.indexOf(status) > 0 ? libs[name].available++ : libs[name].unavailable++;
            }
        });
        for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
        common.completeCallback(callback, responseHoldings);
    };

    // Function: getTitleDetailJson  Enterprise 4.5.1
    var getTitleDetailJson = function (error, msg, res) {
        if (common.handleErrors(callback, responseHoldings, error, msg)) return;
        if (!common.isJsonString(res)) { common.completeCallback(callback, responseHoldings); return }
        processTitleDetail(JSON.parse(res));
    };

    // Function: processTitleDetail.
    var processTitleDetail = function (titles) {
        var libs = {};
        $(titles.childRecords).each(function (i, c) {
            var name = c['LIBRARY'];
            var status = c['SD_ITEM_STATUS'];
            if (!libs[name]) libs[name] = { available: 0, unavailable: 0 };
            lib.Available.indexOf(status) > 0 ? libs[name].available++ : libs[name].unavailable++;
        });
        for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
        common.completeCallback(callback, responseHoldings);
    };

    // Request 1: Call the deep link to the item by ISBN
    // We could also use RSS https://wales.ent.sirsidynix.net.uk/client/rss/hitlist/ynysmon_en/qu=9780747538493
    request.get({ url: responseHoldings.url, headers: header1, timeout: 30000 }, deepLinkResponse);
};