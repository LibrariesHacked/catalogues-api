console.log('solus connector loading...');

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
var isbnRequest = '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><SearchISBN xmlns="http://mobile.solus.co.uk/"><appid>[APPID]</appid><udid>123456789</udid><isbn>[ISBN]</isbn></SearchISBN></soap:Body></soap:Envelope>';
var itemRequest = '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><GetDetails xmlns="http://mobile.solus.co.uk/"><appid>[APPID]</appid><udid>123456789</udid><recordID>[RECORDID]</recordID></GetDetails></soap:Body></soap:Envelope>';

///////////////////////////////////////////
// Function: searchByISBN
// Not actually currently used but could be
// as a backup - though if there were issues
// chances are this wouldn't work either!
///////////////////////////////////////////
exports.searchByISBN = function (isbn, libraryService, callback) {
    var responseHoldings = { service: lib.Name, availability: [], start: new Date() };
    var handleError = function (error) {
        responseHoldings.error = error;
        responseHoldings.end = new Date();
        callback(responseHoldings);
    };

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
                                    responseHoldings.availability.push({ library: item.$.location, available: item.$.status == 'Available for loan' ? 1 : 0, unavailable: item.$.status == 'Available for loan' ? 0 : 1 });
                                });
                                responseHoldings.end = new Date();
                                callback(responseHoldings);
                            });
                        });
                    });
                } else {
                    responseHoldings.end = new Date();
                    callback(responseHoldings);
                }
            });
        });
    });
};