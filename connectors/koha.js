///////////////////////////////////////////
// KOHA
// 
///////////////////////////////////////////
console.log('koha connector loading...');

///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and cheerio for
// querying the HTML returned.
///////////////////////////////////////////
var request = require('request'),
    cheerio = require('cheerio'),
    common = require('../connectors/common');

//////////////////////////
// VARIABLES
//////////////////////////
var catUrl = 'cgi-bin/koha/opac-search.pl?format=rss2&idx=nb&q=';
var libsUrl = 'cgi-bin/koha/opac-search.pl?[MULTIBRANCH]do=Search&expand=holdingbranch#holdingbranch_id'

///////////////////////////////////////////
// Function: getLibraries
///////////////////////////////////////////
exports.getLibraries = function (service, callback) {
    var responseLibraries = { service: service.Name, libraries: [], start: new Date() };
    // Request 1: Call search page with option set to expand branches.
    request.get({ forever: true, url: service.Url + (service.MultiBranchLimit ? libsUrl.replace('[MULTIBRANCH]', 'multibranchlimit=' + service.MultiBranchLimit + '&') : libsUrl.replace('[MULTIBRANCH]', '')), timeout: 60000 }, function (error, message, response) {
        if (common.handleErrors(callback, responseLibraries, error, message)) return;
        $ = cheerio.load(response);
        $('div#location select#branchloop option').each(function () {
            if ($(this).text() != 'All libraries') responseLibraries.libraries.push($(this).text().trim());
        });
        $('li#holdingbranch_id ul li span.facet-label').each(function () {
            responseLibraries.libraries.push($(this).text().trim());
        });
        common.completeCallback(callback, responseLibraries);
    });
};

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = { service: lib.Name, availability: [], start: new Date() };

    // Request 1: The ISBN search
    request.get({ url: lib.Url + catUrl + isbn, timeout: 30000 }, function (error, msg, res) {
        if (common.handleErrors(callback, responseHoldings, error, msg)) return;
        $ = cheerio.load(res, { normalizeWhitespace: true, xmlMode: true });
        var bibLink = $('guid').text();
        if (!bibLink) {
            common.completeCallback(callback, responseHoldings);
            return;
        }

        // Request 2:
        request.get({ url: bibLink + '&viewallitems=1', timeout: 30000 }, function (error, msg, res) {
            if (common.handleErrors(callback, responseHoldings, error, msg)) return;
            $ = cheerio.load(res);
            var libs = {};
            $('.holdingst tbody').find('tr').each(function (i, elem) {
                var lib = $(this).find('td.location span span').eq(1).text().trim();
                var status = $(this).find('td.status span').text().trim();
                if (!libs[lib]) libs[lib] = { available: 0, unavailable: 0 };
                status == 'Available' ? libs[lib].available++ : libs[lib].unavailable++;
            });
            for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
            common.completeCallback(callback, responseHoldings);
        });
    });
};