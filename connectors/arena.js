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

///////////////////////////////////////////
// Function: getLibraries
///////////////////////////////////////////
exports.getLibraries = function (service, callback) {
    var responseLibraries = { service: service.Name, libraries: [], start: new Date() };

    // Request 1: Get advanced search page
    request.get({ forever: true, url: service.Url + service.Advanced, timeout: 20000, jar: true }, function (error, message, response) {
        if (common.handleErrors(callback, responseLibraries, error, message)) return;
        $ = cheerio.load(response);
        var headers = { 'Accept': 'text/xml', 'Wicket-Ajax': true, 'Wicket-FocusedElementId': 'id__extendedSearch__WAR__arenaportlets____d' };
        if (!$('#id__extendedSearch__WAR__arenaportlets____e option')) {
            common.completeCallback(callback, responseLibraries);
            return;
        }

        // Request 2: The select list for libraries is retrieved with a POST request.
        request.post({ jar: true, forever: true, headers: headers, form: { 'organisationHierarchyPanel:organisationContainer:organisationChoice': service.OrganisationId }, url: service.Url + service.Advanced + '?p_p_id=extendedSearch_WAR_arenaportlets&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=/extendedSearch/?wicket:interface=:0:extendedSearchPanel:extendedSearchForm:organisationHierarchyPanel:organisationContainer:organisationChoice::IBehaviorListener:0:&p_p_cacheability=cacheLevelPage&p_p_col_id=column-2&p_p_col_count=1&random=0.1554477137741876' }, function (error, message, response) {
            if (common.handleErrors(callback, responseLibraries, error, message)) return;
            xml2js.parseString(response, function (err, res) {
                if (res['ajax-response'] && res['ajax-response'].component) {
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

    var orgQuery = '';
    if (lib.OrganisationId) orgQuery = 'organisationId_index:' + lib.OrganisationId + '+AND+';
    var bookQuery = '';
    lib.SearchType != 'Keyword' ? bookQuery = lib.ISBNAlias + '_index:' + isbn : bookQuery = isbn;
    var url = lib.Url + searchUrl.replace('[BOOKQUERY]', bookQuery).replace('[ORGQUERY]', orgQuery);

    // Request 1: Perform the search.
    request.get({ forever: true, url: url, timeout: 20000, jar: true }, function (error, message, response) {
        if (common.handleErrors(callback, responseHoldings, error, message)) return;
        // Mega Hack! Find occurence of search_item_id= and then &agency_name=, and get item ID inbetween
        if (response.lastIndexOf("search_item_id=") != -1) {
            var agencyNameInd = response.lastIndexOf("&agency_name=");
            if (agencyNameInd == -1) agencyNameInd = response.lastIndexOf("&amp;agency_name=");
            var itemId = response.substring(response.lastIndexOf("search_item_id=") + 15, agencyNameInd);
            var url = lib.Url + 'results?p_p_state=normal&p_p_lifecycle=1&p_p_action=1&p_p_id=crDetailWicket_WAR_arenaportlets&p_p_col_count=3&p_p_col_id=column-2&p_p_col_pos=1&p_p_mode=view&search_item_no=0&search_type=solr&agency_name=' + lib.ArenaName + '&search_item_id=' + itemId;
            // Request 2: Get the item page.
            request.get({ forever: true, url: url, timeout: 20000, headers: { 'Connection': 'keep-alive' }, jar: true }, function (error, message, response) {

                if (common.handleErrors(callback, responseHoldings, error, message)) return;
                // After getting the item page we may then already have the availability holdings data.
                $ = cheerio.load(response);
                if ($('.arena-availability-viewbranch').length > 0) {
                    var libsData = $('.arena-availability-viewbranch');
                    var noLibs = libsData.length;
                    libsData.each(function (idx) {
                        var libName = $(this).find('.arena-branch-name span').text();
                        var totalAvailable = $(this).find('.arena-availability-info span').eq(0).text().replace('Total ', '');
                        var checkedOut = $(this).find('.arena-availability-info span').eq(1).text().replace('On loan ', '');
                        if (libName) responseHoldings.availability.push({ library: libName, available: (parseInt(totalAvailable) - (checkedOut ? parseInt(checkedOut) : 0)), unavailable: (checkedOut != "" ? parseInt(checkedOut) : 0) });
                    });
                    responseHoldings.end = new Date();
                    callback(responseHoldings);
                }
                else {
                    var resourceId = '/crDetailWicket/?wicket:interface=:0:recordPanel:holdingsPanel::IBehaviorListener:0:';
                    var headers = { 'Accept': 'text/xml', 'Wicket-Ajax': true };
                    url = lib.Url + 'results?p_p_id=crDetailWicket_WAR_arenaportlets&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=' + resourceId + '&p_p_cacheability=cacheLevelPage&p_p_col_id=column-2&p_p_col_pos=1&p_p_col_count=3';
                    // Request 3: After triggering the item page, we should then be able to get the availability container XML data
                    request.get({ forever: true, url: url, headers: headers, timeout: 20000, jar: true }, function (error, message, response) {
                        if (common.handleErrors(callback, responseHoldings, error, message)) return;
                        xml2js.parseString(response, function (err, res) {
                            if (common.handleErrors(callback, responseHoldings, err)) return;
                            if (res['ajax-response'].component) {
                                $ = cheerio.load(res['ajax-response'].component[0]._);

                                var found = false;
                                var numServices = $('.arena-holding-hyper-container .arena-holding-container a span').length;
                                $('.arena-holding-hyper-container .arena-holding-container a span').each(function (index1) {

                                    // Details can return multiple organisations for joint services -- want to just get the right one.
                                    if ($(this).text().trim() == lib.OrganisationName) {
                                        found = true;
                                        // Sometimes at this point this is enough to get the availability
                                        if ($('td.arena-holding-nof-total').length > 0) {
                                            var libsData = $('.arena-holding-child-container');
                                            var noLibs = libsData.length;
                                            libsData.each(function (idx) {
                                                var libName = $(this).find('span.arena-holding-link').text();
                                                var totalAvailable = $(this).find('td.arena-holding-nof-total span.arena-value').text();
                                                var checkedOut = $(this).find('td.arena-holding-nof-checked-out span.arena-value').text();
                                                if (libName) responseHoldings.availability.push({ library: libName, available: (parseInt(totalAvailable) - (checkedOut ? parseInt(checkedOut) : 0)), unavailable: (checkedOut != "" ? parseInt(checkedOut) : 0) });
                                            });
                                            responseHoldings.end = new Date();
                                            callback(responseHoldings);
                                        } else {
                                            headers['Wicket-FocusedElementId'] = 'id__crDetailWicket__WAR__arenaportlets____2a';
                                            resourceId = '/crDetailWicket/?wicket:interface=:0:recordPanel:holdingsPanel:content:holdingsView:' + (index1 + 1) + ':holdingContainer:togglableLink::IBehaviorListener:0:';
                                            url = lib.Url + 'results?p_p_id=crDetailWicket_WAR_arenaportlets&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=' + resourceId + '&p_p_cacheability=';
                                            // Request 4: (Looped) Get the holdings details for that organisation. 
                                            request.get({ forever: true, headers: headers, url: url, timeout: 20000, jar: true }, function (error, message, response) {
                                                if (common.handleErrors(callback, responseHoldings, error, message)) return;
                                                xml2js.parseString(response, function (err, res) {
                                                    if (common.handleErrors(callback, responseHoldings, err)) return;
                                                    $ = cheerio.load(res['ajax-response'].component[0]._);
                                                    var libsData = $('.arena-holding-container');
                                                    var noLibs = libsData.length;
                                                    if (!noLibs || noLibs == 0) {
                                                        responseHoldings.end = new Date();
                                                        callback(responseHoldings);
                                                        return;
                                                    }
                                                    libsData.each(function (index2) {
                                                        var libName = $(this).find('span.arena-holding-link').text();
                                                        resourceId = '/crDetailWicket/?wicket:interface=:0:recordPanel:holdingsPanel:content:holdingsView:' + (index1 + 1) + ':childContainer:childView:' + index2 + ':holdingPanel:holdingContainer:togglableLink::IBehaviorListener:0:';
                                                        url = lib.Url + 'results?p_p_id=crDetailWicket_WAR_arenaportlets&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=' + resourceId + '&p_p_cacheability=';
                                                        // Request 5: (Looped) Get the libraries availability
                                                        request.get({ forever: true, headers: headers, url: url, timeout: 20000, jar: true }, function (error, message, response) {
                                                            if (common.handleErrors(callback, responseHoldings, error, message)) return;
                                                            xml2js.parseString(response, function (err, res) {

                                                                if (common.handleErrors(callback, responseHoldings, err)) return;
                                                                $ = cheerio.load(res['ajax-response'].component[0]._);
                                                                var totalAvailable = $('td.arena-holding-nof-total span.arena-value').text();
                                                                var checkedOut = $('td.arena-holding-nof-checked-out span.arena-value').text();
                                                                responseHoldings.end = new Date();
                                                                responseHoldings.availability.push({ library: libName, available: (parseInt(totalAvailable) - parseInt(checkedOut)), unavailable: parseInt(checkedOut) });
                                                                if ((index2 + 1) == noLibs) {
                                                                    callback(responseHoldings);
                                                                    return;
                                                                };
                                                            });
                                                        });
                                                    });
                                                });
                                            });
                                        }
                                    } else {
                                        if ((index1 + 1) == numServices && !found) {
                                            responseHoldings.end = new Date();
                                            callback(responseHoldings);
                                            return;
                                        }
                                    }
                                });
                            } else {
                                responseHoldings.end = new Date();
                                callback(responseHoldings);
                            }
                        });
                    });
                }
            });
        } else {
            responseHoldings.end = new Date();
            callback(responseHoldings);
        }
    });
};