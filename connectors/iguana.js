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
    var responseHoldings = { service: lib.Name, availability: [], start: new Date() };
    var handleError = function (error) {
        if (error) {
            responseHoldings.error = error;
            responseHoldings.end = new Date();
            callback(responseHoldings);
            return true;
        }
    };

    // Request 1: Post to the search web service
    request.post({ url: lib.Url + 'Proxy.SearchRequest.cls', body: reqBody.replace('[ISBN]', isbn).replace('[DB]', lib.Database).replace('[TID]', 'Iguana_Brief'), headers: reqHeader, timeout: 20000 }, function (error, msg, response) {
        if (handleError(error)) return;
        xml2js.parseString(response, function (err, res) {
            if (handleError(err)) return;
            // Loop through all the holdings records.
            res["zs:searchRetrieveResponse"]["zs:records"][0]["zs:record"][0]["zs:recordData"][0].BibDocument[0].HoldingsSummary[0].ShelfmarkData.forEach(function (item) {
                responseHoldings.availability.push({ library: item.Shelfmark[0], available: item.Available[0], unavailable: item.Available == "0" ? 1 : 0 });
            });
        });
        responseHoldings.end = new Date();
        callback(responseHoldings);
    });
};