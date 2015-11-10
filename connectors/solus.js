var xml2js = require('xml2js');
var request = require('request');


var isbnRequest = '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><SearchISBN xmlns="http://mobile.solus.co.uk/"><appid>[APPID]</appid><udid>123456789</udid><isbn>[ISBN]</isbn></SearchISBN></soap:Body></soap:Envelope>';
var itemRequest = '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><GetDetails xmlns="http://mobile.solus.co.uk/"><appid>[APPID]</appid><udid>123456789</udid><recordID>[RECORDID]</recordID></GetDetails></soap:Body></soap:Envelope>';

exports.searchByISBN = function (isbn, libraryService, callback) {

    // Brighton Rock: 9780140004427

    var responseHoldings = [];

	var soapXML = isbnRequest.replace('[ISBN]', isbn).replace('[APPID]', libraryService.Id);
	var optionsISBN = {
	    url: libraryService.Url + '?op=SearchISBN',
		body: soapXML,
		headers: {
			"Content-Type": "text/xml; charset=utf-8",
			"Content-Length": soapXML.length,
			"SOAPAction": "http://mobile.solus.co.uk/SearchISBN"
		}
    };

	request.post(optionsISBN, function (error, msg, response) {
	    
	    xml2js.parseString(response, function (err, result) {
	        
		    var soapResponse = result['soap:Envelope']['soap:Body'][0]['SearchISBNResponse'][0]['SearchISBNResult'];
		    var resultString = soapResponse[0];
		    xml2js.parseString(resultString, function (err, res) {
		        
                if (res.items.item) {

                    var itemId = res.items.item[0].$.recordID;
                    var soapXML = itemRequest.replace('[RECORDID]', itemId).replace('[APPID]', libraryService.Id);
                    var optionsItemDetail = {
                        url: libraryService.Url + '?op=GetDetails',
                        body: soapXML,
                        headers: {
                            "Content-Type": "text/xml; charset=utf-8",
                            "Content-Length": soapXML.length,
                            "SOAPAction": "http://mobile.solus.co.uk/GetDetails"
                        }
                    };

                    request.post(optionsItemDetail, function (error, msg, res) {

                        xml2js.parseString(res, function (err, details) {

                            var soapDetailsResponse = details['soap:Envelope']['soap:Body'][0]['GetDetailsResponse'][0]['GetDetailsResult'];
                            var resultDetailsString = soapDetailsResponse[0];

                            console.log(resultDetailsString);
                            xml2js.parseString(resultDetailsString, function (err, holdings) {
                                var availability = holdings.items.availability;
                                for (var i = 0; i < availability.length ; i++) {
                                    var onLoan = 0;
                                    var available = 0;
                                    if (availability[i].$.status == 'Available for loan') {
                                        available = 1;
                                    } else {
                                        onLoan = 1;
                                    }
                                    responseHoldings.push({ library: availability[i].$.location, available: available, onLoan: onLoan });
                                }
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