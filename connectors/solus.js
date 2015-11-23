///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and xml2js for 
// converting xml response to JSON
///////////////////////////////////////////
var xml2js = require('xml2js'),
    request = require('request');
console.log('solus connector loading...');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////
var isbnRequest = '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><SearchISBN xmlns="http://mobile.solus.co.uk/"><appid>[APPID]</appid><udid>123456789</udid><isbn>[ISBN]</isbn></SearchISBN></soap:Body></soap:Envelope>';
var itemRequest = '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><GetDetails xmlns="http://mobile.solus.co.uk/"><appid>[APPID]</appid><udid>123456789</udid><recordID>[RECORDID]</recordID></GetDetails></soap:Body></soap:Envelope>';

///////////////////////////////////////////
// Function: searchByISBN
///////////////////////////////////////////
exports.searchByISBN = function (isbn, libraryService, callback) {
    var responseHoldings = [];
    var soapXML = isbnRequest.replace('[ISBN]', isbn).replace('[APPID]', libraryService.Id);
    request.post({ url: libraryService.Url + '?op=SearchISBN', body: soapXML, headers: { "Content-Type": "text/xml; charset=utf-8", "Content-Length": soapXML.length, "SOAPAction": "http://mobile.solus.co.uk/SearchISBN" } }, function (error, msg, response) {
        xml2js.parseString(response, function (err, result) {
            var soapResponse = result['soap:Envelope']['soap:Body'][0]['SearchISBNResponse'][0]['SearchISBNResult'];
            var resultString = soapResponse[0];
            xml2js.parseString(resultString, function (err, res) {
                if (res.items.item) {
                    var itemId = res.items.item[0].$.recordID;
                    var soapXML = itemRequest.replace('[RECORDID]', itemId).replace('[APPID]', libraryService.Id);

                    request.post({ url: libraryService.Url + '?op=GetDetails', body: soapXML, headers: { "Content-Type": "text/xml; charset=utf-8", "Content-Length": soapXML.length, "SOAPAction": "http://mobile.solus.co.uk/GetDetails" } }, function (error, msg, res) {
                        xml2js.parseString(res, function (err, details) {
                            var soapDetailsResponse = details['soap:Envelope']['soap:Body'][0]['GetDetailsResponse'][0]['GetDetailsResult'];
                            var resultDetailsString = soapDetailsResponse[0];
                            xml2js.parseString(resultDetailsString, function (err, holdings) {
                                holdings.items.availability.forEach(function (item) {
                                    responseHoldings.push({ library: item.$.location, available: item.$.status == 'Available for loan' ? 1 : 0, unavailable: item.$.status == 'Available for loan' ? 0 : 1 });
                                });
                                callback(responseHoldings);
                            });
                        });
                    });
                } else {
                    callback(responseHoldings);
                }
            });
        });
    });
};