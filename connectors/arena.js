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
var searchUrl = 'search?p_p_state=normal&p_p_lifecycle=1&p_p_action=1&p_p_id=searchResult_WAR_arenaportlets&p_p_col_count=5&p_p_col_id=column-1&p_p_col_pos=1&p_p_mode=view&search_item_no=0&search_type=solr&search_query=organisationId_index:[ORGID] AND number_index:[ISBN]';

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

    // Request 1: Perform the search.
    request.get({ forever: true, url: lib.Url + searchUrl.replace('[ISBN]', isbn).replace('[ORGID]', lib.OrganisationId), headers: { 'Connection': 'keep-alive' }, timeout: 10000, jar: true }, function (error, message, response) {
        if (handleError(error)) return;
        // Mega Hack! Find occurence of search_item_id= and then &agency_name=, and get item ID inbetween
        var itemId = response.substring(response.lastIndexOf("search_item_id=") + 15, response.lastIndexOf("&agency_name="));
        if (itemId) {
            var url = lib.Url + 'results?p_p_state=normal&p_p_lifecycle=1&p_p_action=1&p_p_id=crDetailWicket_WAR_arenaportlets&p_p_col_count=4&p_p_col_id=column-2&p_p_col_pos=1&p_p_mode=view&facet_queries=&search_item_no=0&sort_advice=field%3DRelevance%26direction%3DDescending&search_item_id=' + itemId + '&agency_name=AUK000226&search_type=solr&search_query=organisationId_index%3AAUK000226%7C6+AND+number_index%3A9780747532743';
            // Call the item page.
            request.get({ forever: true, url: url, timeout: 10000, headers: { 'Connection': 'keep-alive' }, jar: true }, function (error, message, response) {
                // Request 3: After triggering the item page, we should then be able to get the availability container XML data
                var headers = { 'Accept': 'text/xml', 'Wicket-Ajax': true };
                url = lib.Url + 'results?p_p_id=crDetailWicket_WAR_arenaportlets&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=%2FcrDetailWicket%2F%3Fwicket%3Ainterface%3D%3A0%3ArecordPanel%3AholdingsPanel%3A%3AIBehaviorListener%3A0%3A&p_p_cacheability=cacheLevelPage&p_p_col_id=column-2&p_p_col_pos=1&p_p_col_count=3';
                request.get({ forever: true, url: url, headers: headers, timeout: 10000, jar: true }, function (error, message, response) {
                    if (handleError(error)) return;
                    console.log(response);
                });
            });
        } else {
            responseHoldings.end = new Date();
            callback(responseHoldings)
        }
    });
};