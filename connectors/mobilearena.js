///////////////////////////////////////////
// MOBILEARENA
// 
///////////////////////////////////////////
console.log('mobilearena connector loading...');

///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and xml2js for 
// converting xml response to JSON
///////////////////////////////////////////
var xml2js = require('xml2js'),
    request = require('request'),
    common = request('../connectors/common');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////
var searchRequest = '<x:Envelope xmlns:x="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.search.palma.services.arena.axiell.com/" xmlns:sea="http://axiell.com/arena/services/palma/search/searchrequest" xmlns:uti="http://axiell.com/arena/services/palma/util"><x:Header/><x:Body><ser:Search><sea:searchRequest><uti:arenaMember>[SERVICEID]</uti:arenaMember><uti:language>en</uti:language><sea:pageSize>1</sea:pageSize><sea:query>[ISBN]</sea:query></sea:searchRequest></ser:Search></x:Body></x:Envelope>';
var detailsRequest = '<x:Envelope xmlns:x="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.search.palma.services.arena.axiell.com/" xmlns:cat="http://axiell.com/arena/services/palma/search/catalogueRecordDetailrequest" xmlns:uti="http://axiell.com/arena/services/palma/util" xmlns:crd="http://axiell.com/arena/services/palma/util/crd"><x:Header/><x:Body><ser:GetCatalogueRecordDetail><cat:catalogueRecordDetailRequest><uti:arenaMember>[SERVICEID]</uti:arenaMember><crd:id>[CRID]</crd:id><uti:language>en</uti:language><cat:holdings enable="yes"/></cat:catalogueRecordDetailRequest></ser:GetCatalogueRecordDetail></x:Body></x:Envelope>';
var reqHeader = { "Content-Type": "text/xml; charset=utf-8" };

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
    var responseLibraries = { service: service.Name, code: service.Code, libraries: [], start: new Date() };

    // Request 1: Get advanced search page
    request.get({ url: service.Url + 'advanced-search', timeout: 60000 }, function (error, message, response) {
        if (common.handleErrors(callback, responseLibraries, error, msg)) return;
        common.completeCallback(callback, responseLibraries);
    });
};

///////////////////////////////////////////
// Function searchByISBN
// Implementing the search by ISBN - in this case calls a SOAP webservice 
// that is otherwise used by the axiell mobile app.
// also a backup to the web scraping (arena) - query with axiell?
///////////////////////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = { service: lib.Name, code: lib.Code, availability: [], start: new Date() };

    var soapSearchXML = searchRequest.replace('[ISBN]', isbn).replace('[SERVICEID]', lib.Id);
    // Request 1: Search for the item ID from ISBN
    // RejectUnauthorised used (for Leicester City).  What's up with that SSL certificate?
    request.post({ url: lib.Url, body: soapSearchXML, headers: reqHeader, timeout: 30000 }, function (error, msg, response) {
        if (common.handleErrors(callback, responseHoldings, error, msg)) return;
        xml2js.parseString(response, function (err, res) {
            if (common.handleErrors(callback, responseHoldings, err)) return;
            var soapResponse = res['soap:Envelope']['soap:Body'][0]['ns1:SearchResponse'][0]['searchResponse'];

            if (!soapResponse[0] && soapResponse[0].catalogueRecords && soapResponse[0].catalogueRecords[0]) {
                common.completeCallback(callback, responseHoldings);
                return;
            }

            var crId = soapResponse[0].catalogueRecords[0].catalogueRecord[0].id;
            var soapDetailXML = detailsRequest.replace('[CRID]', crId).replace('[SERVICEID]', lib.Id);
            // Request 2: Search for item details (which will include availability holdings information.
            request.post({ url: lib.Url, body: soapDetailXML, headers: reqHeader, timeout: 30000 }, function (error, msg, response) {
                if (common.handleErrors(callback, responseHoldings, error, msg)) return;
                xml2js.parseString(response, function (err, res) {
                    if (common.handleErrors(callback, responseHoldings, err)) return;
                    var soapResponse = res['soap:Envelope']['soap:Body'][0]['ns1:GetCatalogueRecordDetailResponse'][0]['catalogueRecordDetailResponse'];
                    if (soapResponse[0] && soapResponse[0].holdings) {
                        var holdings = soapResponse[0].holdings[0].holding;
                        for (var i = 0; i < holdings.length ; i++) responseHoldings.availability.push({ library: holdings[i].$.branch, available: parseInt(holdings[i].$.nofAvailableForLoan), unavailable: parseInt(holdings[i].$.nofCheckedOut) });
                    }
                    common.completeCallback(callback, responseHoldings);
                });
            });
        });
    });
};