///////////////////////////////////////////
// IGUANA
// 
///////////////////////////////////////////
console.log('iguana connector loading...');

///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and xml2js for 
// converting xml response to JSON
///////////////////////////////////////////
var xml2js = require('xml2js'),
    request = require('request'),
    common = require('../connectors/common');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////
var itemSearch = 'Application=Bib&BestMatch=99&FacetedSearch=Yes&Associations=Also&Database=[DB]&ExportByTemplate=Brief&fu=BibSearch&Index=Isbn&Language=eng&NumberToRetrieve=1000&RequestType=ResultSet_DisplayList&SearchTechnique=Find&WithoutRestrictions=Yes&TemplateId=[TID]&Profile=Iguana&Request=[ISBN]';
var facetSearch = 'FacetedSearch=[RESULTID]&FacetsFound=&fu=BibSearch';
var reqHeader = { "Content-Type": "application/x-www-form-urlencoded" };
var home = 'www.main.cls';

///////////////////////////////////////////
// Function: getLibraries
// Iguana doesn't seem to offer filter by 
// library on their advanced search.
// Hmmmmm, do a very general search and get the facets.
///////////////////////////////////////////
exports.getLibraries = function (service, callback) {
    var responseLibraries = { service: service.Name, libraries: [], start: new Date() };

    request.post({ url: service.Url + 'Proxy.SearchRequest.cls', jar: true, body: itemSearch.replace('[ISBN]', 'a').replace('Index=Isbn', 'Index=Keywords').replace('[DB]', service.Database).replace('[TID]', 'Iguana_Brief'), headers: reqHeader, timeout: 30000 }, function (error, msg, response) {
        if (common.handleErrors(callback, responseLibraries, error, msg)) return;
        xml2js.parseString(response, function (err, res) {
            if (common.handleErrors(callback, responseLibraries, err, msg)) return;
            // Some installations seem to support faceted searching and filtering
            // while others don't bring anything back.
            if (service.Faceted) {
                var resultId = res["zs:searchRetrieveResponse"]["zs:resultSetId"][0];
                request.post({ url: service.Url + 'Proxy.SearchRequest.cls', jar: true, body: facetSearch.replace('[RESULTID]', resultId), headers: reqHeader, timeout: 30000 }, function (error, msg, response) {
                    if (common.handleErrors(callback, responseLibraries, error, msg)) return;
                    xml2js.parseString(response, function (err, res) {
                        if (common.handleErrors(callback, responseLibraries, err)) return;
                        var facets = res.VubisFacetedSearchResponse.Facets[0].Facet;
                        if (facets && facets[0]) {
                            facets[0].FacetEntry.forEach(function (entry) {
                                responseLibraries.libraries.push(entry.Display[0]);
                            });
                        }
                        common.completeCallback(callback, responseLibraries);
                    });
                });
            } else {
                // Loop through the search results and try to get unique entries from 
                // the holdings data.
                var records = res['zs:searchRetrieveResponse']['zs:records'][0]['zs:record'];
                // Loop through all the records
                records.forEach(function (record) {
                    // Loop through all the holdings records.
                    if (record['zs:recordData'] && record['zs:recordData'][0] && record['zs:recordData'][0].BibDocument && record['zs:recordData'][0].BibDocument[0] && record['zs:recordData'][0].BibDocument[0].HoldingsSummary && record['zs:recordData'][0].BibDocument[0].HoldingsSummary[0]) {
                        record['zs:recordData'][0].BibDocument[0].HoldingsSummary[0].ShelfmarkData.forEach(function (item) {
                            var lib = item.Shelfmark[0].split(' : ')[0];
                            if (responseLibraries.libraries.indexOf(lib) == -1) responseLibraries.libraries.push(lib);
                        });
                    }
                });
                common.completeCallback(callback, responseLibraries);
            }
        });
    });
};

///////////////////////////////////////////
// Function: searchByISBN
///////////////////////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = { service: lib.Name, availability: [], start: new Date() };

    // Request 1: Post to the search web service
    request.post({ url: lib.Url + 'Proxy.SearchRequest.cls', body: itemSearch.replace('[ISBN]', isbn).replace('[DB]', lib.Database).replace('[TID]', 'Iguana_Brief'), headers: reqHeader, timeout: 60000 }, function (error, msg, response) {
        if (common.handleErrors(callback, responseHoldings, error, msg)) return;
        xml2js.parseString(response, function (err, res) {
            if (common.handleErrors(callback, responseHoldings, error)) return;
            var record = res['zs:searchRetrieveResponse']['zs:records'][0]['zs:record'];
            if (record) var recordData = record[0]['zs:recordData'];
            // Loop through all the holdings records.
            if (recordData && recordData[0] && recordData[0].BibDocument && recordData[0].BibDocument[0] && recordData[0].BibDocument[0].HoldingsSummary && recordData[0].BibDocument[0].HoldingsSummary[0]) {
                recordData[0].BibDocument[0].HoldingsSummary[0].ShelfmarkData.forEach(function (item) {
                    var lib = item.Shelfmark[0].split(' : ')[0];
                    responseHoldings.availability.push({ library: lib, available: item.Available[0], unavailable: item.Available == "0" ? 1 : 0 });
                });
            }
            common.completeCallback(callback, responseHoldings);
        });
    });
};