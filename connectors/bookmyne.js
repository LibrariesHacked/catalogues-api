///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls)
///////////////////////////////////////////
var request = require('request');
console.log('bookmyne connector loading...');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////
var host = "bookmyne.bc.sirsidynix.net"
var headers = { "Accept": "application/json", "Accept-Language": "en-gb", "Host": host, "Referer": "https://" + host + "/bookmyne/app.html#extendedDetail" };
var searchUrl = "/search/os?q=GENERAL%3A[ISBN]&qf=GENERAL&rw=0&ct=10&pr=[PROFILE]&ext=dss&library_id=[LIBID]";

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    headers["ILS-Profile"] = libraryService.Profile;
    headers["SD-Institution"] = libraryService.InstitutionId;
    headers["SD-Region"] = libraryService.Region;
    var responseHoldings = [];
    // Request 1: Call web service to get the item ID
    request.get({ url: lib.Url + searchUrl.replace('[ISBN]', isbn).replace('[PROFILE]', lib.Profile).replace('[LIBID]', lib.Id), headers: headers }, function (error, msg, response) {
        var jsonResponse = JSON.parse(response);
        if (jsonResponse.totalResults && jsonResponse.totalResults > 0) {
            var id = jsonResponse.entry[0].id;
            // Request 2: Call web service to get the holdings
            request.get({ url: libraryService.Url + '/title/holdings?title_id=' + id, headers: headers }, function (error, msg, response) {
                JSON.parse(response).holdingList.forEach(function (holding) {
                    var libs = {};
                    holding.holdingsItemList.forEach(function (item) {
                        var name = holding.libraryDescription;
                        if (!libs[name]) libs[name] = { available: 0, unavailable: 0 };
                        item.currentLocation == 'SHELF' ? libs[name].available++ : libs[name].unavailable++;
                    });
                });
                for (var l in libs) responseHoldings.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
                callback(responseHoldings);
            })
        } else {
            callback(responseHoldings);
        }
    });
};