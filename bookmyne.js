////////////////////
// Requires
////////////////////
var request = require('request');

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, libraryService, callback) {

    var responseHoldings = [];

    var headers = {
        "Accept": "application/json",
        "Accept-Language": "en-gb",
        "Host": "bookmyne.bc.sirsidynix.net",
        "ILS-Profile": libraryService.Profile,
        "Referer": "https://bookmyne.bc.sirsidynix.net/bookmyne/app.html#extendedDetail",
        "SD-Institution": +libraryService.InstitutionId,
        "SD-Region": +libraryService.Region
    };

    // Need to search first by 13 digit ISBN
    var titlesOptions = {
        url: libraryService.Url + '/search/os?q=GENERAL%3A' + isbn + '&qf=GENERAL&rw=0&ct=10&pr=' + libraryService.Profile + '&ext=dss&library_id=' + libraryService.Id,
        headers: headers
    };

    request.get(titlesOptions, function (error, msg, response) {

        // the response should include the title id
        var jsonResponse = JSON.parse(response);
        if (jsonResponse.totalResults && jsonResponse.totalResults > 0) {
            var id = jsonResponse.entry[0].id;
            var holdingsOptions = {
                url: libraryService.Url + '/title/holdings?title_id=' + id,
                headers: headers
            };

            request.get(holdingsOptions, function (error, msg, response) {
                console.log(response);
                var holdings = JSON.parse(response).holdingList;

                for (var holding in holdings) {
                    var noAvailable = 0;
                    var noItems = 0;
                    var noOnLoan = 0;
                    var holdingsItemList = holdings[holding].holdingsItemList;
                    for (var item in holdingsItemList) {
                        noItems++;
                        if (holdingsItemList[item].currentLocation == 'SHELF') noAvailable++;
                        if (holdingsItemList[item].currentLocation == 'ON-LOAN') noOnLoan++;
                        if (holdingsItemList[item].currentLocation == 'INTRANSIT') noOnLoan++;
                    }

                    responseHoldings.push({ library: holdings[holding].libraryDescription, available: noAvailable, onLoan: noOnLoan });
                }
                callback(responseHoldings);
            })
        } else {
            callback(responseHoldings);
        }
    });
};