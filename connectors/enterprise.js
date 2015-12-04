console.log('enterprise connector loading...');

///////////////////////////////////////////
// REQUIRES
// Request (for HTTP calls) and cheerio for
// querying the HTML returned.
///////////////////////////////////////////
var request = require('request'),
    cheerio = require('cheerio');

///////////////////////////////////////////
// VARIABLES
///////////////////////////////////////////
var searchUrl = 'search/results?qu=';
var itemUrl = 'search/detailnonmodal/ent:[ILS]/one';
var header1 = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Safari/537.36 Edge/13.10586' };
var header2 = { 'X-Requested-With': 'XMLHttpRequest' };

//////////////////////////
// Function: searchByISBN
//////////////////////////
exports.searchByISBN = function (isbn, lib, callback) {
    var responseHoldings = { service: lib.Name, availability: [], start: new Date() };
    var handleError = function (error) {
        responseHoldings.error = error;
        responseHoldings.end = new Date();
        callback(responseHoldings);
    };
    // Request 1: Call the deep link to the item by ISBN
    request.get({ url: lib.Url + searchUrl + isbn, headers: header1 }, function (error, msg, resp1) {
        if (error) {
            handleError(error);
        } else {
            // Internal function to get availability - called either immediately (if redirected onto the main item page)
            // Or after a second request to go to the item page.
            var getItemAvailability = function (ils, itemPage) {
                // Request 2: A post request returns the data used to show the availability information
                request.post({ url: lib.Url + lib.AvailabilityUrl + ils.split('/').join('$002f'), headers: header2 }, function (error, msg, resp2) {
                    var avail = null;
                    // This could fail from not returning JSON - stick in a try/catch
                    try {
                        avail = JSON.parse(resp2);
                        $ = cheerio.load(itemPage);
                        var libs = {};
                        $('.detailItemsTableRow').each(function (index, elem) {
                            var name = $(this).find('td').eq(0).text().trim();
                            var bc = $(this).find('td div').attr('id').replace('availabilityDiv', '');
                            // The status search can go down (while item details are still returned.  in this case just have to bail out.
                            // -- should in future be able to return a bit more info
                            if (avail.ids && avail.ids.length > 0) {
                                var status = avail.strings[avail.ids.indexOf(bc)].trim();
                                if (!libs[name]) libs[name] = { available: 0, unavailable: 0 };
                                lib.Available.indexOf(status) > 0 ? libs[name].available++ : libs[name].unavailable++;
                            }
                        });
                        for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable });
                        responseHoldings.end = new Date();
                        callback(responseHoldings);
                    } catch (e) {
                        handleError(e.message);
                    }
                });
            }
            var uri = msg.request.uri.path
            var ils = uri.substring(uri.lastIndexOf("ent:") + 4, uri.lastIndexOf("/one;"));

            // Bail out here if we don't get back an ID.
            if (!ils) {
                
            } else if (ils == '/cl') {
                // In this situation need to call the item page.
                ils = null;
                $ = cheerio.load(resp1);
                if ($('#da0').attr('value')) ils = $('#da0').attr('value').substring($('#da0').attr('value').lastIndexOf("ent:") + 4);
                // Get the item page
                if (ils != null) {
                    request.get(lib.Url + itemUrl.replace('[ILS]', ils.split('/').join('$002f')), function (error, message, response) {
                        if (error) {
                            handleError(error);
                        } else {
                            getItemAvailability(ils, response);
                        }
                    });
                } else {
                    responseHoldings.end = new Date();
                    callback(responseHoldings);
                }
            } else {
                getItemAvailability(ils, resp1);
            }
        }
    });
};