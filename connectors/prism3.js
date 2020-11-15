/// ////////////////////////////////////////
// PRISM3
//
/// ////////////////////////////////////////
console.log('prism3 connector loading...')

/// ////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and cheerio for
// querying the HTML returned.
/// ////////////////////////////////////////
var request = require('request')
var cheerio = require('cheerio')
var common = require('../connectors/common')

/// ////////////////////////////////////////
// VARIABLES
/// ////////////////////////////////////////
var reqHeader = { 'Content-Type': 'text/xml; charset=utf-8' }

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
  request.get({ url: service.Url + 'advancedsearch?target=catalogue', timeout: 60000 }, function (error, message, response) {
    if (common.handleErrors(callback, responseLibraries, error, message)) return
    $ = cheerio.load(response)
    $('#locdd option').each(function () {
      if ($(this).text() != '') responseLibraries.libraries.push($(this).text())
    })
    common.completeCallback(callback, responseLibraries)
  })
}

/// ///////////////////////
// Function: searchByISBN
/// ///////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
  var responseHoldings = { service: lib.Name, code: lib.Code, availability: [], start: new Date() }
  // Request 1:
  request.get({ url: lib.Url + 'items.json?query=' + isbn, headers: reqHeader, timeout: 30000 }, function (error, msg, response) {
    if (common.handleErrors(callback, responseHoldings, error, msg)) return
    var res = JSON.parse(response)
    var itemUrl = Object.keys(res)[2]
    if (!itemUrl) {
      common.completeCallback(callback, responseHoldings)
      return
    }
    // Request 2:
    request.get({ url: itemUrl, headers: reqHeader, timeout: 30000 }, function (error, msg, res) {
      if (common.handleErrors(callback, responseHoldings, error, msg)) return
      $ = cheerio.load(res)
      $('#availability').find('ul.options li').each(function (i, elem) {
        var libr = { library: $(this).find('h3 span span').text().trim(), available: 0, unavailable: 0 }
        $(this).find('div.jsHidden table tbody tr').each(function (i, elem) {
          lib.Available.indexOf($(this).find('td.item-status span').text().trim()) > -1 ? libr.available++ : libr.unavailable++
        })
        responseHoldings.availability.push(libr)
      })
      common.completeCallback(callback, responseHoldings)
    })
  })
}
