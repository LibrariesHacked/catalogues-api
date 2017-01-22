///////////////////////////////////////////
// OPEN LIBRARY
///////////////////////////////////////////
console.log('open library connector loading...');

///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls)
///////////////////////////////////////////
var request = require('request'),
    common = require('../connectors/common');

///////////////////////////////////////////
// OPENLIBRARY VARIABLES
///////////////////////////////////////////
var url = 'http://openlibrary.org/search.json?q=';

///////////////////////////////////////////
// Function: search
///////////////////////////////////////////
exports.search = function (query, callback) {
    var responseData = { books: [] };
    var handleSearchResponse = function (err, msg, res) {
        if (common.handleErrors(callback, responseData, err, msg)) return;
        JSON.parse(res).docs.forEach(function (b, a) { responseData.books.push({ title: b.title, author: b.author_name, isbn: b.isbn }); });
        callback(responseData);
    };
    // Request 1: Call to OpenLibrary search which returns JSON
    request.get({ url: url + query, timeout: 1000 }, handleSearchResponse);
};