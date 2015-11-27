console.log('iguana connector loading...');

///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and xml2js for 
// converting xml response to JSON
///////////////////////////////////////////
var xml2js = require('xml2js'),
    request = require('request');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////
var reqBody = 'Application=Bib&BestMatch=99&Associations=Also&Database=[DB]&ExportByTemplate=Brief&fu=BibSearch&Index=Isbn&Language=eng&NumberToRetrieve=1000&RequestType=ResultSet_DisplayList&SearchTechnique=Find&WithoutRestrictions=Yes&TemplateId=[TID]&Profile=Iguana&Request=[ISBN]';
var reqHeader = { "Content-Type": "application/x-www-form-urlencoded" };

///////////////////////////////////////////
// Function: searchByISBN
///////////////////////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = [];
    // Request 1: Post to the search web service
    request.post({ url: lib.Url + 'Proxy.SearchRequest.cls', body: reqBody.replace('[ISBN]', isbn).replace('[DB]', lib.Database).replace('[TID]', 'Iguana_Brief'), headers: reqHeader }, function (error, msg, response) {
        if (error) {
            callback(responseHoldings);
        } else {
            xml2js.parseString(response, function (err, res) {
                var holdings = res["zs:searchRetrieveResponse"]["zs:records"][0]["zs:record"][0]["zs:recordData"][0].BibDocument[0].HoldingsSummary[0].ShelfmarkData;
                holdings.forEach(function (item) {
                    responseHoldings.push({ library: item.Shelfmark[0], available: item.Available[0], unavailable: item.Available == "0" ? 1 : 0 });
                });
            });
            callback(responseHoldings);
        }
    });
};