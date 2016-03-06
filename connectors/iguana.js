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
var home = 'www.main.cls';

///////////////////////////////////////////
// Function: getLibraries
// Iguana doesn't seem to offer filter by 
// library on their advanced search.
// But, they have a new mobile app.
///////////////////////////////////////////
exports.getLibraries = function (service, callback) {
    var responseLibraries = { service: service.Name, libs: [], start: new Date() };
    var handleError = function (error) {
        if (error) {
            responseLibraries.error = error;
            responseLibraries.end = new Date();
            callback(responseLibraries);
            return true;
        }
    };
    var reqStatusCheck = function (message) {
        if (message.statusCode != 200) {
            responseLibraries.error = "Web request error.";
            responseLibraries.end = new Date();
            callback(responseLibraries);
            return true;
        }
    };

    // Request 1: Get advanced search page
    request.get({ url: service.Url, timeout: 30000 }, function (error, message, response) {
        if (handleError(error)) return;
	if (reqStatusCheck(message)) return;
        responseLibraries.end = new Date();
        callback(responseLibraries);
    });
};

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
    request.post({ url: lib.Url + 'Proxy.SearchRequest.cls', body: reqBody.replace('[ISBN]', isbn).replace('[DB]', lib.Database).replace('[TID]', 'Iguana_Brief'), headers: reqHeader, timeout: 60000 }, function (error, msg, response) {
        if (handleError(error)) return;
        xml2js.parseString(response, function (err, res) {
            if (handleError(err)) return;
            var record = res["zs:searchRetrieveResponse"]["zs:records"][0]["zs:record"];
            if (record) var recordData = record[0]["zs:recordData"];
            // Loop through all the holdings records.
            if (recordData && recordData[0] && recordData[0].BibDocument && recordData[0].BibDocument[0] && recordData[0].BibDocument[0].HoldingsSummary && recordData[0].BibDocument[0].HoldingsSummary[0]) {
                recordData[0].BibDocument[0].HoldingsSummary[0].ShelfmarkData.forEach(function (item) {
                    var libName = item.Shelfmark[0];
                    if (libName.indexOf(' : ') != -1) libName = libName.split(' : ')[0];
                    if (item.Shelfmark) responseHoldings.availability.push({ library: libName, available: item.Available[0], unavailable: item.Available == "0" ? 1 : 0 });
                });
            }
            responseHoldings.end = new Date();
            callback(responseHoldings);
        });
    });
};