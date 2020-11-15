/// ////////////////////////////////////////
// WEBPAC
//
/// ////////////////////////////////////////
console.log('webpac connector loading')

/// ////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and cheerio for
// querying HTML returned.
/// ////////////////////////////////////////
var request = require('request')
var cheerio = require('cheerio')
var common = require('../connectors/common')

/// ////////////////////////////////////////
// Function: getService
/// ////////////////////////////////////////
exports.getService = function (svc) {
  var service = common.getService(svc);
  return service;
}

/// ////////////////////////////////////////
// Function: getLibraries
/// ////////////////////////////////////////
exports.getLibraries = function (service, callback) {
  var responseLibraries = { service: service.Name, code: service.Code, libraries: [], start: new Date() }

  // Request 1: Get advanced search page
  request.get({ url: service.Url + 'search/X', timeout: 60000 }, function (error, message, response) {
    if (common.handleErrors(callback, responseLibraries, error, message)) return
    $ = cheerio.load(response)
    $('select[Name=b] option').each(function () {
      if ($(this).text() != 'ANY') responseLibraries.libraries.push($(this).text().trim())
    })
    common.completeCallback(callback, responseLibraries)
  })
}

/// ////////////////////////////////////////
// Function: searchByISBN
/// ////////////////////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
  var responseHoldings = { service: lib.Name, code: lib.Code, availability: [], start: new Date(), url: lib.Url + 'search~S1?/i' + isbn + '/i' + isbn + '/1,1,1,E/holdings&FF=i' + isbn + '&1,1,' }

  // Request 1: Use the item deep link URL
  request.get({ url: responseHoldings.url, timeout: 60000 }, function (error, msg, response) {
    if (common.handleErrors(callback, responseHoldings, error, msg)) return
    var libs = {}
    $ = cheerio.load(response)
    $('table.bibItems tr.bibItemsEntry').each(function (index, elem) {
      var name = $(this).find('td').eq(0).text().trim()
      var status = $(this).find('td').eq(2).text().trim()
      if (!libs[name]) libs[name] = { available: 0, unavailable: 0 }
      status == 'AVAILABLE' ? libs[name].available++ : libs[name].unavailable++
    })
    for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable })
    common.completeCallback(callback, responseHoldings)
  })
}
