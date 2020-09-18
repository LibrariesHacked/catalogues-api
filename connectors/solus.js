/// ////////////////////////////////////////
// AQUABROWSER
//
/// ////////////////////////////////////////
console.log('solus connector loading...')

/// ////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and xml2js for
// converting xml response to JSON
/// ////////////////////////////////////////
var xml2js = require('xml2js')
var request = require('request')
var common = require('../connectors/common')

/// ////////////////////////////////////////
// VARIABLES
/// ////////////////////////////////////////
var isbnRequest = '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><SearchISBN xmlns="http://mobile.solus.co.uk/"><appid>[APPID]</appid><udid>123456789</udid><isbn>[ISBN]</isbn></SearchISBN></soap:Body></soap:Envelope>'
var itemRequest = '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><GetDetails xmlns="http://mobile.solus.co.uk/"><appid>[APPID]</appid><udid>123456789</udid><recordID>[RECORDID]</recordID></GetDetails></soap:Body></soap:Envelope>'

/// ////////////////////////////////////////
// Function: getService
/// ////////////////////////////////////////
exports.getService = function (svc, callback) {
  var service = common.getService(svc)
  callback(service)
}

/// ////////////////////////////////////////
// Function: getLibraries
/// ////////////////////////////////////////
exports.getLibraries = function (service, callback) {
  var responseLibraries = { service: service.Name, code: service.Code, libraries: [], start: new Date() }

  // Request 1: Get advanced search page
  request.get({ url: service.Url + 'advanced-search', timeout: 60000 }, function (error, message, response) {
    if (common.handleErrors(callback, responseLibraries, error, message)) return
    common.completeCallback(callback, responseLibraries)
  })
}

/// ////////////////////////////////////////
// Function: searchByISBN
// Not actually currently used but could be
// as a backup - though if there were issues
// chances are this wouldn't work either!
/// ////////////////////////////////////////
exports.searchByISBN = function (isbn, libraryService, callback) {
  var responseHoldings = { service: lib.Name, code: lib.Code, availability: [], start: new Date() }

  var soapXML = isbnRequest.replace('[ISBN]', isbn).replace('[APPID]', libraryService.Id)
  // Request 1: Search for the item by ISBN
  request.post({ url: libraryService.Url + '?op=SearchISBN', body: soapXML, headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Content-Length': soapXML.length, SOAPAction: 'http://mobile.solus.co.uk/SearchISBN' }, timeout: 30000 }, function (error, msg, response) {
    if (common.handleErrors(callback, responseHoldings, error, msg)) return
    xml2js.parseString(response, function (err, result) {
      if (common.handleErrors(callback, responseHoldings, err)) return

      xml2js.parseString(result['soap:Envelope']['soap:Body'][0].SearchISBNResponse[0].SearchISBNResult[0], function (err, res) {
        if (common.handleErrors(callback, responseHoldings, err)) return
        if (!res.items.item) {
          common.completeCallback(callback, responseHoldings)
          return
        }

        var soapXML = itemRequest.replace('[RECORDID]', res.items.item[0].$.recordID).replace('[APPID]', libraryService.Id)
        // Request 2: Get the item details using the returned ItemId
        request.post({ url: libraryService.Url + '?op=GetDetails', body: soapXML, headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Content-Length': soapXML.length, SOAPAction: 'http://mobile.solus.co.uk/GetDetails' }, timeout: 30000 }, function (error, msg, res) {
          if (common.handleErrors(callback, responseHoldings, error, msg)) return
          xml2js.parseString(res, function (err, details) {
            if (common.handleErrors(callback, responseHoldings, err)) return
            xml2js.parseString(details['soap:Envelope']['soap:Body'][0].GetDetailsResponse[0].GetDetailsResult[0], function (err, holdings) {
              if (common.handleErrors(callback, responseHoldings, err)) return
              holdings.items.availability.forEach(function (item) {
                responseHoldings.availability.push({ library: item.$.location, available: item.$.status == 'Available for loan' ? 1 : 0, unavailable: item.$.status == 'Available for loan' ? 0 : 1 })
              })
              common.completeCallback(callback, responseHoldings)
            })
          })
        })
      })
    })
  })
}
