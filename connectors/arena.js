///////////////////////////////////////////
// ARENA
// 
///////////////////////////////////////////
console.log('arena connector loading...');

///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls)
///////////////////////////////////////////
var request = require('request'),
    xml2js = require('xml2js'),
    cheerio = require('cheerio'),
    common = require('../connectors/common'),
    forever = require('forever-agent');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////
var itemUrl = 'results?p_auth=cnJs8BK0&p_p_id=crDetailWicket_WAR_arenaportlets&p_p_lifecycle=1&p_p_state=normal&p_p_mode=view&p_p_col_id=column-2&p_p_col_pos=2&p_p_col_count=4&p_r_p_687834046_facet_queries=&p_r_p_687834046_search_item_no=0&p_r_p_687834046_sort_advice=field%3DRelevance%26direction%3DDescending&p_r_p_687834046_search_type=solr&p_r_p_687834046_search_item_id=[ITEMID]&p_r_p_687834046_agency_name=[ARENANAME]';
var searchUrl = 'search?p_auth=NJXnzkEv&p_p_id=searchResult_WAR_arenaportlets&p_p_lifecycle=1&p_p_state=normal&p_p_mode=view&p_r_p_687834046_facet_queries=&p_r_p_687834046_sort_advice=field%3DRelevance%26direction%3DDescending&p_r_p_687834046_search_type=solr&p_r_p_687834046_search_query=[BOOKQUERY]';
var availabilityContainer = '/crDetailWicket/?wicket:interface=:0:recordPanel:holdingsPanel::IBehaviorListener:0:';

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
    var agent = forever.ForeverAgent;
    var responseLibraries = { service: service.Name, libraries: [], start: new Date() };
    // Hardcoded returns.  A few instances don't seem to give an option of filtering by library.
    if (service.Libraries) {
        for (lib in service.Libraries) responseLibraries.libraries.push(lib);
        common.completeCallback(callback, responseLibraries); return;
    }
    var options = { url: service.Url + service.Advanced, timeout: 30000, jar: true, agent: agent, rejectUnauthorized: (service.IgnoreSSL ? false : true) };

    ///////////////////////////////////////////////
    // handleItemRequest(error, message, response)
    ///////////////////////////////////////////////
    var handleItemRequest = function (error, message, response) {
        if (common.handleErrors(callback, responseLibraries, error, message)) return;
        xml2js.parseString(response, function (err, res) {
            if (common.handleErrors(callback, responseLibraries, err)) return;
            if (res && res['ajax-response'] && res['ajax-response'].component) {
                $ = cheerio.load(res['ajax-response'].component[0]._);
                $('option').each(function () {
                    if ($(this).text() !== 'Select library') responseLibraries.libraries.push($(this).text());
                });
            }
            common.completeCallback(callback, responseLibraries); return;
        });
    };

    ///////////////////////////////////////////////
    // handleSearchRequest(error, message, response)
    ///////////////////////////////////////////////
    var handleSearchRequest = function (error, message, response) {
        if (common.handleErrors(callback, responseLibraries, error, message)) return;
        $ = cheerio.load(response);
        var headers = { 'Accept': 'text/xml', 'Wicket-Ajax': true, 'Wicket-FocusedElementId': 'id__extendedSearch__WAR__arenaportlets____d' };
        if ($('.arena-extended-search-branch-choice option').length > 1) {
            $('.arena-extended-search-branch-choice option').each(function () {
                if ($(this).text() != 'Select library') responseLibraries.libraries.push($(this).text());
            });
            common.completeCallback(callback, responseLibraries); return;
        }
        var options = { rejectUnauthorized: (service.IgnoreSSL ? false : true), jar: true, agent: agent, timeout: 30000, headers: headers, form: { 'organisationHierarchyPanel:organisationContainer:organisationChoice': service.OrganisationId }, url: service.Url + service.Advanced + '?p_p_id=extendedSearch_WAR_arenaportlets&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=/extendedSearch/?wicket:interface=:0:extendedSearchPanel:extendedSearchForm:organisationHierarchyPanel:organisationContainer:organisationChoice::IBehaviorListener:0:&p_p_cacheability=cacheLevelPage&p_p_col_id=column-2&p_p_col_count=1&random=0.1554477137741876' };
        // Request 2: The select list for libraries is retrieved with a POST request.
        request.post(options, handleItemRequest);
    };
    // Request 1: Get advanced search page
    request.get(options, handleSearchRequest);
};

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = { service: lib.Name, availability: [], start: new Date() };
    var agent = forever.ForeverAgent;
    var numLibs = 0;
    var currentOrg = null;
    var currentBranch = 0;
    var currentLibName = '';

    ///////////////////////////////////////////////
    // handleSearchRequest
    // Step 1: Handle the search
    ///////////////////////////////////////////////
    var handleSearchRequest = function (error, message, response) {
        if (common.handleErrors(callback, responseHoldings, error, message)) return;
        if (response.lastIndexOf('search_item_id=') === -1) { common.completeCallback(callback, responseHoldings); return; }
        var itemId = response.substring(response.lastIndexOf("search_item_id=") + 15);
        var url = lib.Url + itemUrl.replace('[ARENANAME]', lib.ArenaName).replace('[ITEMID]', itemId.substring(0, itemId.indexOf('&')));
        request.get({ agent: agent, rejectUnauthorized: !lib.IgnoreSSL, url: url, timeout: 20000, headers: { 'Connection': 'keep-alive' }, jar: true }, handleItemPage);
    };

    ///////////////////////////////////////////////
    // handleItemPage
    // Step 2: Handle the item page
    ///////////////////////////////////////////////
    var handleItemPage = function (error, message, response) {
        if (common.handleErrors(callback, responseHoldings, error, message)) return;
        $ = cheerio.load(response);
        if ($('.arena-availability-viewbranch').length > 0) {
            $('.arena-availability-viewbranch').each(function (idx) {
                var libName = $(this).find('.arena-branch-name span').text();
                var totalAvailable = $(this).find('.arena-availability-info span').eq(0).text().replace('Total ', '');
                var checkedOut = $(this).find('.arena-availability-info span').eq(1).text().replace('On loan ', '');
                if (libName) responseHoldings.availability.push({ library: libName, available: (parseInt(totalAvailable) - (checkedOut ? parseInt(checkedOut) : 0)), unavailable: (checkedOut != "" ? parseInt(checkedOut) : 0) });
            });
            common.completeCallback(callback, responseHoldings); return;
        }
        var headers = { 'Accept': 'text/xml', 'Wicket-Ajax': true };
        var url = lib.Url + 'results?p_p_id=crDetailWicket_WAR_arenaportlets&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=' + availabilityContainer + '&p_p_cacheability=cacheLevelPage&p_p_col_id=column-2&p_p_col_pos=1&p_p_col_count=3';
        request.get({ agent: agent, rejectUnauthorized: !lib.IgnoreSSL, url: url, headers: headers, timeout: 20000, jar: true }, getAvailabilityContainer);
    };

    ///////////////////////////////////////////////
    // getAvailabilityContainer
    // Step 3: Get the item pages availability container.
    ///////////////////////////////////////////////
    var getAvailabilityContainer = function (error, message, response) {
        if (common.handleErrors(callback, responseHoldings, error, message)) return;
        xml2js.parseString(response, parseAvailabilityContainer);
    };

    ///////////////////////////////////////////////
    // parseAvailabilityContainer
    // Step 4: 
    ///////////////////////////////////////////////
    var parseAvailabilityContainer = function (err, res) {
        if (common.handleErrors(callback, responseHoldings, err)) return;
        if (!res['ajax-response'].component) { common.completeCallback(callback, responseHoldings); return; }
        $ = cheerio.load(res['ajax-response'].component[0]._);
        // Sometimes at this point this is enough to get the availability
        if ($('.arena-holding-nof-total, .arena-holding-nof-checked-out, .arena-holding-nof-available-for-loan').length > 0) {
            $('.arena-holding-child-container').each(function (idx) {
                var libName = $(this).find('span.arena-holding-link').text();
                var totalAvailable = $(this).find('td.arena-holding-nof-total span.arena-value').text() || (parseInt($(this).find('td.arena-holding-nof-available-for-loan span.arena-value').text() || 0) + parseInt($(this).find('td.arena-holding-nof-checked-out span.arena-value').text() || 0));
                var checkedOut = $(this).find('td.arena-holding-nof-checked-out span.arena-value').text();
                if (libName) responseHoldings.availability.push({ library: libName, available: (parseInt(totalAvailable) - (checkedOut ? parseInt(checkedOut) : 0)), unavailable: (checkedOut != "" ? parseInt(checkedOut) : 0) });
            });
            common.completeCallback(callback, responseHoldings); return;
        }
        $('.arena-holding-hyper-container .arena-holding-container a span').each(function (i) { if ($(this).text().trim() === (lib.OrganisationName || lib.Name)) currentOrg = i; });
        if (currentOrg == null) { common.completeCallback(callback, responseHoldings); return; }
        var headers = { 'Accept': 'text/xml', 'Wicket-Ajax': true };
        headers['Wicket-FocusedElementId'] = 'id__crDetailWicket__WAR__arenaportlets____2a';
        resourceId = '/crDetailWicket/?wicket:interface=:0:recordPanel:holdingsPanel:content:holdingsView:' + (currentOrg + 1) + ':holdingContainer:togglableLink::IBehaviorListener:0:';
        url = lib.Url + 'results?p_p_id=crDetailWicket_WAR_arenaportlets&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=' + resourceId + '&p_p_cacheability=';
        request.get({ agent: agent, rejectUnauthorized: !lib.IgnoreSSL, headers: headers, url: url, timeout: 20000, jar: true }, getHoldings); return false;
    };

    ///////////////////////////////////////////////
    // getHoldings
    ///////////////////////////////////////////////
    var getHoldings = function (error, message, response) {
        if (common.handleErrors(callback, responseHoldings, error, message)) return;
        xml2js.parseString(response, parseHoldings);
    };

    ///////////////////////////////////////////////
    // parseHoldings
    // Step 6: 
    ///////////////////////////////////////////////
    var parseHoldings = function (err, res) {
        if (common.handleErrors(callback, responseHoldings, err)) return;
        $ = cheerio.load(res['ajax-response'].component[0]._);
        var libsData = $('.arena-holding-container');
        numLibs = libsData.length;
        if (!numLibs || numLibs == 0) { common.completeCallback(callback, responseHoldings); return; }
        currentBranch = 0;
        libsData.each(function (i) {
            currentLibName = $(this).find('span.arena-holding-link').text();
            resourceId = '/crDetailWicket/?wicket:interface=:0:recordPanel:holdingsPanel:content:holdingsView:' + (currentOrg + 1) + ':childContainer:childView:' + i + ':holdingPanel:holdingContainer:togglableLink::IBehaviorListener:0:';
            url = lib.Url + 'results?p_p_id=crDetailWicket_WAR_arenaportlets&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=' + resourceId + '&p_p_cacheability=';
            // Request 5: (Looped) Get the libraries availability
            var headers = { 'Accept': 'text/xml', 'Wicket-Ajax': true };
            request.get({ agent: agent, rejectUnauthorized: !lib.IgnoreSSL, headers: headers, url: url, timeout: 20000, jar: true }, getLibraryAvailability);
        });
    };

    ///////////////////////////////////////////////
    // getLibraryAvailability
    // Step 7: 
    ///////////////////////////////////////////////
    var getLibraryAvailability = function (error, message, response) {
        if (common.handleErrors(callback, responseHoldings, error, message)) return;
        xml2js.parseString(response, parseLibraryAvailability);
    };

    ///////////////////////////////////////////////
    // parseLibraryAvailability
    // Step 8: Parse the library availability.
    ///////////////////////////////////////////////
    var parseLibraryAvailability = function (err, res) {
        currentBranch = currentBranch + 1;
        if (common.handleErrors(callback, responseHoldings, err)) return;
        if (res && res['ajax-response']) {
            $ = cheerio.load(res['ajax-response'].component[0]._);
            var totalAvailable = $('td.arena-holding-nof-total span.arena-value').text();
            var checkedOut = $('td.arena-holding-nof-checked-out span.arena-value').text();
            responseHoldings.availability.push({ library: currentLibName, available: (parseInt(totalAvailable) - parseInt(checkedOut)), unavailable: parseInt(checkedOut) });
        }
        if (currentBranch == numLibs) { common.completeCallback(callback, responseHoldings); return; }
    };

    var bookQuery = (lib.SearchType != 'Keyword' ? lib.ISBNAlias + '_index:' + isbn : isbn);
    if (lib.OrganisationId) bookQuery = 'organisationId_index:' + lib.OrganisationId + '+AND+' + bookQuery;
    responseHoldings.url = lib.Url + searchUrl.replace('[BOOKQUERY]', bookQuery);
    // Request 1: Perform the search
    request.get({ url: responseHoldings.url, timeout: 20000, jar: true, agent: agent, rejectUnauthorized: !lib.IgnoreSSL }, handleSearchRequest);
};