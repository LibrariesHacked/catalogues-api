///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and xml2js for 
// converting xml response to JSON
///////////////////////////////////////////
var xml2js = require('xml2js'),
    request = require('request');
console.log('iguana connector loading...');

/////////////
// Variables
////////////
var reqBody = 'Application=Bib&Associations=Also&Database=1_LIBS&ExportByTemplate=Brief&fu=BibSearch&Index=Keywords&Language=eng&NumberToRetrieve=1000&Request=[ISBN]&RequestType=ResultSet_DisplayList&SearchTechnique=Find';
var reqHeader = { "Content-Type": "application/x-www-form-urlencoded" };

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = [];
    // Request 1: Post to the search web service
    request.post({ url: lib.Url + 'Proxy.SearchRequest.cls', body: requestBody.replace('[ISBN]', isbn), headers: reqHeader }, function (error, msg, response) {
        xml2js.parseString(response, function (err, res) {
            var holdings = res["zs:searchRetrieveResponse"]["zs:records"][0]["zs:record"][0]["zs:recordData"][0].BibDocument[0].HoldingsSummary[0].ShelfmarkData;
            holdings.forEach(function (item) {
                responseHoldings.push({ library: item.Shelfmark[0], available: item.Available[0], unavailable: item.Available == "0" ? 1 : 0 });
            });
        });
        callback(responseHoldings);
    });
};