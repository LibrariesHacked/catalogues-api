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
    common = require('../connectors/common');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////
var searchUrl = 'search?p_p_state=normal&p_p_lifecycle=1&p_p_action=1&p_p_id=searchResult_WAR_arenaportlets&p_p_col_count=5&p_p_col_id=column-1&p_p_col_pos=1&p_p_mode=view&search_item_no=0&search_type=solr&search_query=[ORGQUERY][BOOKQUERY]';
var itemUrl = 'results?p_p_state=normal&p_p_lifecycle=1&p_p_action=1&p_p_id=crDetailWicket_WAR_arenaportlets&p_p_col_count=3&p_p_col_id=column-2&p_p_col_pos=1&p_p_mode=view&search_item_no=0&search_type=solr&agency_name=[ARENANAME]&search_item_id=[ITEMID]';

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

    // Hardcoded returns.  A few instances just don't seem to give an option of filtering by library.
    if (service.Libraries) {
        for (lib in service.Libraries) responseLibraries.libraries.push(lib);
        common.completeCallback(callback, responseLibraries);
        return;
    }

    var options = { url: service.Url + service.Advanced, timeout: 30000, jar: true };
    if (service.IgnoreSSL) options.rejectUnauthorized = false;
    // Request 1: Get advanced search page
    request.get(options, function (error, message, response) {
        if (common.handleErrors(callback, responseLibraries, error, message)) return;
        $ = cheerio.load(response);
        var headers = { 'Accept': 'text/xml', 'Wicket-Ajax': true, 'Wicket-FocusedElementId': 'id__extendedSearch__WAR__arenaportlets____d' };
        if ($('.arena-extended-search-branch-choice option').length > 1) {
            $('.arena-extended-search-branch-choice option').each(function () {
                if ($(this).text() != 'Select library') responseLibraries.libraries.push($(this).text());
            });
            common.completeCallback(callback, responseLibraries);
            return;
        }

        var options = { jar: true, timeout: 30000, headers: headers, form: { 'organisationHierarchyPanel:organisationContainer:organisationChoice': service.OrganisationId }, url: service.Url + service.Advanced + '?p_p_id=extendedSearch_WAR_arenaportlets&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=/extendedSearch/?wicket:interface=:0:extendedSearchPanel:extendedSearchForm:organisationHierarchyPanel:organisationContainer:organisationChoice::IBehaviorListener:0:&p_p_cacheability=cacheLevelPage&p_p_col_id=column-2&p_p_col_count=1&random=0.1554477137741876' };
        if (service.IgnoreSSL) options.rejectUnauthorized = false;
        // Request 2: The select list for libraries is retrieved with a POST request.
        request.post(options, function (error, message, response) {
            if (common.handleErrors(callback, responseLibraries, error, message)) return;
            xml2js.parseString(response, function (err, res) {
                if (common.handleErrors(callback, responseLibraries, err)) return;
                if (res && res['ajax-response'] && res['ajax-response'].component) {
                    $ = cheerio.load(res['ajax-response'].component[0]._);
                    $('option').each(function () {
                        if ($(this).text() != 'Select library') responseLibraries.libraries.push($(this).text());
                    });
                }
                common.completeCallback(callback, responseLibraries);
            });
        });
    });
};

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    if (lib.ISBN == 10) isbn = isbn.substring(3);
    var responseHoldings = { service: lib.Name, availability: [], start: new Date() };

    var url = lib.Url + searchUrl.replace('[BOOKQUERY]', (lib.SearchType != 'Keyword' ? lib.ISBNAlias + '_index:' + isbn : isbn)).replace('[ORGQUERY]', (lib.OrganisationId ? 'organisationId_index:' + lib.OrganisationId + '+AND+' : ''));

    // Request 1: Perform the search.
    request.get({ forever: true, url: url, timeout: 20000, jar: true, rejectUnauthorized: !lib.IgnoreSSL }, function (error, message, response) {
        if (common.handleErrors(callback, responseHoldings, error, message)) return;
        if (response.lastIndexOf('search_item_id=') == -1) {
            common.completeCallback(callback, responseHoldings);
            return;
        }

        // Mega Hack! Find occurence of search_item_id= and then &agency_name=, and get item ID inbetween
        var itemId = response.substring(response.lastIndexOf("search_item_id=") + 15, response.lastIndexOf("agency_name="));
        // Request 2: Get the item page.
        request.get({ forever: true, rejectUnauthorized: !lib.IgnoreSSL, url: lib.Url + itemUrl.replace('[ARENANAME]', lib.ArenaName).replace('[ITEMID]', itemId), timeout: 20000, headers: { 'Connection': 'keep-alive' }, jar: true }, function (error, message, response) {
            if (common.handleErrors(callback, responseHoldings, error, message)) return;

            // After getting the item page we may then already have the availability holdings data.
            $ = cheerio.load(response);
            if ($('.arena-availability-viewbranch').length > 0) {
                var libsData = $('.arena-availability-viewbranch');
                libsData.each(function (idx) {
                    var libName = $(this).find('.arena-branch-name span').text();
                    var totalAvailable = $(this).find('.arena-availability-info span').eq(0).text().replace('Total ', '');
                    var checkedOut = $(this).find('.arena-availability-info span').eq(1).text().replace('On loan ', '');
                    if (libName) responseHoldings.availability.push({ library: libName, available: (parseInt(totalAvailable) - (checkedOut ? parseInt(checkedOut) : 0)), unavailable: (checkedOut != "" ? parseInt(checkedOut) : 0) });
                });
                common.completeCallback(callback, responseHoldings);
                return;
            }

            // Otherwise carry on...
            var resourceId = '/crDetailWicket/?wicket:interface=:0:recordPanel:holdingsPanel::IBehaviorListener:0:';
            var headers = { 'Accept': 'text/xml', 'Wicket-Ajax': true };
            url = lib.Url + 'results?p_p_id=crDetailWicket_WAR_arenaportlets&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=' + resourceId + '&p_p_cacheability=cacheLevelPage&p_p_col_id=column-2&p_p_col_pos=1&p_p_col_count=3';
            // Request 3: After triggering the item page, we should then be able to get the availability container XML data
            request.get({ forever: true, rejectUnauthorized: !lib.IgnoreSSL, url: url, headers: headers, timeout: 20000, jar: true }, function (error, message, response) {
                if (common.handleErrors(callback, responseHoldings, error, message)) return;
                xml2js.parseString(response, function (err, res) {
                    if (common.handleErrors(callback, responseHoldings, err)) return;

                    if (!res['ajax-response'].component) {
                        common.completeCallback(callback, responseHoldings);
                        return;
                    }

                    $ = cheerio.load(res['ajax-response'].component[0]._);
                    var found = false;
                    var numServices = $('.arena-holding-hyper-container .arena-holding-container a span').length;
                    $('.arena-holding-hyper-container .arena-holding-container a span').each(function (index1) {
                        if ($(this).text().trim() == lib.OrganisationName && !found) {
                            // We have matching results for this library service.
                            found = true;
                            // Sometimes at this point this is enough to get the availability
                            if ($('td.arena-holding-nof-total').length > 0) {
                                $('.arena-holding-child-container').each(function (idx) {
                                    var libName = $(this).find('span.arena-holding-link').text();
                                    var totalAvailable = $(this).find('td.arena-holding-nof-total span.arena-value').text();
                                    var checkedOut = $(this).find('td.arena-holding-nof-checked-out span.arena-value').text();
                                    if (libName) responseHoldings.availability.push({ library: libName, available: (parseInt(totalAvailable) - (checkedOut ? parseInt(checkedOut) : 0)), unavailable: (checkedOut != "" ? parseInt(checkedOut) : 0) });
                                });
                                common.completeCallback(callback, responseHoldings);
                            } else {
                                // Else we need to make an additional call to get the data for that library service
                                headers['Wicket-FocusedElementId'] = 'id__crDetailWicket__WAR__arenaportlets____2a';
                                resourceId = '/crDetailWicket/?wicket:interface=:0:recordPanel:holdingsPanel:content:holdingsView:' + (index1 + 1) + ':holdingContainer:togglableLink::IBehaviorListener:0:';
                                url = lib.Url + 'results?p_p_id=crDetailWicket_WAR_arenaportlets&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=' + resourceId + '&p_p_cacheability=';
                                // Request 4: (Looped) Get the holdings details for that branch. 
                                request.get({ forever: true, rejectUnauthorized: !lib.IgnoreSSL, headers: headers, url: url, timeout: 20000, jar: true }, function (error, message, response) {
                                    if (common.handleErrors(callback, responseHoldings, error, message)) return;
                                    xml2js.parseString(response, function (err, res) {
                                        if (common.handleErrors(callback, responseHoldings, err)) return;
                                        $ = cheerio.load(res['ajax-response'].component[0]._);
                                        var libsData = $('.arena-holding-container');
                                        var noLibs = libsData.length;
                                        if (!noLibs || noLibs == 0) {
                                            common.completeCallback(callback, responseHoldings);
                                            return;
                                        }
                                        libsData.each(function (index2) {
                                            var libName = $(this).find('span.arena-holding-link').text();
                                            resourceId = '/crDetailWicket/?wicket:interface=:0:recordPanel:holdingsPanel:content:holdingsView:' + (index1 + 1) + ':childContainer:childView:' + index2 + ':holdingPanel:holdingContainer:togglableLink::IBehaviorListener:0:';
                                            url = lib.Url + 'results?p_p_id=crDetailWicket_WAR_arenaportlets&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=' + resourceId + '&p_p_cacheability=';

                                            // Request 5: (Looped) Get the libraries availability
                                            request.get({ forever: true, rejectUnauthorized: !lib.IgnoreSSL, headers: headers, url: url, timeout: 20000, jar: true }, function (error, message, response) {
                                                if (common.handleErrors(callback, responseHoldings, error, message)) return;
                                                xml2js.parseString(response, function (err, res) {
                                                    if (common.handleErrors(callback, responseHoldings, err)) return;
                                                    $ = cheerio.load(res['ajax-response'].component[0]._);
                                                    var totalAvailable = $('td.arena-holding-nof-total span.arena-value').text();
                                                    var checkedOut = $('td.arena-holding-nof-checked-out span.arena-value').text();

                                                    responseHoldings.availability.push({ library: libName, available: (parseInt(totalAvailable) - parseInt(checkedOut)), unavailable: parseInt(checkedOut) });
                                                    if ((index2 + 1) == noLibs) {
                                                        common.completeCallback(callback, responseHoldings);
                                                        return;
                                                    };
                                                });
                                            });
                                        });
                                    });
                                });
                            }
                        }
                        if ($(this).text().trim() != lib.OrganisationName && (index1 + 1) == numServices && !found) {
                            // In this case we've gone through all results and there are none for this library service.
                            common.completeCallback(callback, responseHoldings);
                            return;
                        }
                    });
                });
            });
        });
    });
};