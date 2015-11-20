////////////////////
// Requires
////////////////////
var request = require('request');

/////////////
// Variables
////////////

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {

    var responseHoldings = [];
    // Request 1:
    request.get({ url: lib.Url + 'List.csp?SearchT1=' + isbn + '&Index1=Keywords&Database=1&Location=NoPreference&Language=NoPreference&PublicationType=NoPreference&OpacLanguage=eng&NumberToRetrieve=50&SearchMethod=Find_1&SearchTerm1=' + isbn + '&Profile=Default&PreviousList=Start&PageType=Start&EncodedRequest=&WebPageNr=1&WebAction=NewSearch', headers: reqHeader }, function (error, msg, response) {



    });

};