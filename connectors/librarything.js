/// ////////////////////////////////////////
// LIBRARYTHING
/// ////////////////////////////////////////
console.log('library thing connector loading...')

/// ////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and xml2js for
// converting xml response to JSON
/// ////////////////////////////////////////
var xml2js = require('xml2js')
var request = require('request')
var common = require('../connectors/common')

/// ////////////////////////////////////////
// LIBRARYTHING VARIABLES
/// ////////////////////////////////////////
var url = 'http://www.librarything.com/api/thingISBN/'

/// ////////////////////////////////////////
// Function: thingISBN
/// ////////////////////////////////////////
exports.thingISBN = function (isbn, callback) {
  var responseISBNs = { isbns: [] }
  var handleThingISBN = function (err, msg, res) {
    if (common.handleErrors(callback, responseISBNs, err, msg)) return
    xml2js.parseString(res, parseISBNResponse)
  }
  var parseISBNResponse = function (err, res) {
    if (common.handleErrors(callback, responseISBNs, err)) return
    var isbns = res.idlist.isbn
    if (isbns) isbns.forEach(function (item) { responseISBNs.isbns.push(item) })
    common.completeCallback(callback, responseISBNs)
  }
  // Request 1: Call to LibraryThing which returns XML of ISBNs
  request.get({ url: url + isbn, timeout: 1000 }, handleThingISBN)
}
