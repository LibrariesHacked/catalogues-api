console.log('mobilearena connector loading...');

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
var searchRequest = '<x:Envelope xmlns:x="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.search.palma.services.arena.axiell.com/" xmlns:sea="http://axiell.com/arena/services/palma/search/searchrequest" xmlns:uti="http://axiell.com/arena/services/palma/util"><x:Header/><x:Body><ser:Search><sea:searchRequest><uti:arenaMember>[SERVICEID]</uti:arenaMember><uti:language>en</uti:language><sea:pageSize>1</sea:pageSize><sea:query>[ISBN]</sea:query></sea:searchRequest></ser:Search></x:Body></x:Envelope>';
var detailsRequest = '<x:Envelope xmlns:x="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.search.palma.services.arena.axiell.com/" xmlns:cat="http://axiell.com/arena/services/palma/search/catalogueRecordDetailrequest" xmlns:uti="http://axiell.com/arena/services/palma/util" xmlns:crd="http://axiell.com/arena/services/palma/util/crd"><x:Header/><x:Body><ser:GetCatalogueRecordDetail><cat:catalogueRecordDetailRequest><uti:arenaMember>[SERVICEID]</uti:arenaMember><crd:id>[CRID]</crd:id><uti:language>en</uti:language><cat:holdings enable="yes"/></cat:catalogueRecordDetailRequest></ser:GetCatalogueRecordDetail></x:Body></x:Envelope>';
var reqHeader = { "Content-Type": "text/xml; charset=utf-8" };

///////////////////////////////////////////
// Function searchByISBN
// Implementing the search by ISBN - in this case calls a SOAP webservice 
// that is otherwise used by the axiell mobile app.
// also a backup to the web scraping (arena) - query with axiell?
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

    var soapSearchXML = searchRequest.replace('[ISBN]', isbn).replace('[SERVICEID]', lib.Id);
    // Request 1: Search for the item ID from ISBN
    // RejectUnauthorised used again (for Leicester City).  Investigate.
    request.post({ url: lib.Url, body: soapSearchXML, headers: reqHeader, rejectUnauthorized: false, timeout: 20000 }, function (error, msg, response) {
        if (handleError(error)) return;
        xml2js.parseString(response, function (err, res) {
            if (handleError(err)) return;
            var soapResponse = res['soap:Envelope']['soap:Body'][0]['ns1:SearchResponse'][0]['searchResponse'];
            if (soapResponse[0] && soapResponse[0].catalogueRecords && soapResponse[0].catalogueRecords[0]) {
                var crId = soapResponse[0].catalogueRecords[0].catalogueRecord[0].id;
                var soapDetailXML = detailsRequest.replace('[CRID]', crId).replace('[SERVICEID]', lib.Id);
                // Request 2: Search for item details (which will include availability holdings information.
                request.post({ url: lib.Url, body: soapDetailXML, headers: reqHeader, rejectUnauthorized: false, timeout: 20000 }, function (error, msg, response) {
                    if (handleError(error)) return;
                    xml2js.parseString(response, function (err, res) {
                        if (handleError(err)) return;
                        var soapResponse = res['soap:Envelope']['soap:Body'][0]['ns1:GetCatalogueRecordDetailResponse'][0]['catalogueRecordDetailResponse'];
                        if (soapResponse[0] && soapResponse[0].holdings) {
                            var holdings = soapResponse[0].holdings[0].holding;
                            for (var i = 0; i < holdings.length ; i++) responseHoldings.availability.push({ library: holdings[i].$.branch, available: parseInt(holdings[i].$.nofAvailableForLoan), unavailable: parseInt(holdings[i].$.nofCheckedOut) });
                        }
                        responseHoldings.end = new Date();
                        callback(responseHoldings);
                    });
                });
            } else {
                responseHoldings.end = new Date();
                callback(responseHoldings);
            }
        });
    });
};