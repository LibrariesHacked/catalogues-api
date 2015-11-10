////////////////////
// Requires section
////////////////////
var xml2js = require('xml2js');
var request = require('request');

////////////////////
// Variables
////////////////////
var searchRequest = '<x:Envelope xmlns:x="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.search.palma.services.arena.axiell.com/" xmlns:sea="http://axiell.com/arena/services/palma/search/searchrequest" xmlns:uti="http://axiell.com/arena/services/palma/util"><x:Header/><x:Body><ser:Search><sea:searchRequest><uti:arenaMember>[SERVICEID]</uti:arenaMember><uti:language>en</uti:language><sea:pageSize>1</sea:pageSize><sea:query>[ISBN]</sea:query></sea:searchRequest></ser:Search></x:Body></x:Envelope>';
var detailsRequest = '<x:Envelope xmlns:x="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.search.palma.services.arena.axiell.com/" xmlns:cat="http://axiell.com/arena/services/palma/search/catalogueRecordDetailrequest" xmlns:uti="http://axiell.com/arena/services/palma/util" xmlns:crd="http://axiell.com/arena/services/palma/util/crd"><x:Header/><x:Body><ser:GetCatalogueRecordDetail><cat:catalogueRecordDetailRequest><uti:arenaMember>[SERVICEID]</uti:arenaMember><crd:id>[CRID]</crd:id><uti:language>en</uti:language><cat:holdings enable="yes"/></cat:catalogueRecordDetailRequest></ser:GetCatalogueRecordDetail></x:Body></x:Envelope>';
var reqHeader = { "Content-Type": "text/xml; charset=utf-8" };

/////////////////////////
// Function searchByISBN
// Implementing the search by ISBN - in this case calls a SOAP webservice 
// that is otherwise used by the axill mobile app.
/////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {

    var responseHoldings = [];
    var soapSearchXML = searchRequest.replace('[ISBN]', isbn).replace('[SERVICEID]', lib.Id);

    // Request 1: Search for the item ID from ISBN 
    // Internal ID required to then retrieve holdings.
    request.post({ url: lib.Url, body: soapSearchXML, headers: reqHeader }, function (error, msg, response) {

        xml2js.parseString(response, function (err, res) {
            var soapResponse = res['soap:Envelope']['soap:Body'][0]['ns1:SearchResponse'][0]['searchResponse'];
            if (soapResponse[0] && soapResponse[0].catalogueRecords && soapResponse[0].catalogueRecords[0]) {

                var crId = soapResponse[0].catalogueRecords[0].catalogueRecord[0].id;
                var soapDetailXML = detailsRequest.replace('[CRID]', crId).replace('[SERVICEID]', lib.Id);

                // Request 2: Search for item details (which will include availability 
                // holdings information.
                request.post({ url: lib.Url, body: soapDetailXML, headers: reqHeader }, function (error, msg, response) {

                    xml2js.parseString(response, function (err, res) {
                        var soapResponse = res['soap:Envelope']['soap:Body'][0]['ns1:GetCatalogueRecordDetailResponse'][0]['catalogueRecordDetailResponse'];
                        if (soapResponse[0] && soapResponse[0].holdings) {
                            var holdings = soapResponse[0].holdings[0].holding;
                            for (var i = 0; i < holdings.length ; i++) {
                                responseHoldings.push({ library: holdings[i].$.branch, available: parseInt(holdings[i].$.nofAvailableForLoan), onLoan: parseInt(holdings[i].$.nofCheckedOut) });
                            }
                        }
                        callback(responseHoldings);
                    });
                });
            } else {
                callback(responseHoldings);
            }
        });
    });
};