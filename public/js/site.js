$(function () {

    $.sum = function (arr) {
        var r = 0;
        $.each(arr, function (i, v) { r += v; });
        return r;
    }

    var libraryServices = [];
    var isbns = { tens: [], thirteens: [] };
    var updateResults;
    var map = L.map('map', { zoomControl: false }).setView([52.6, -2.5], 7);
    L.tileLayer(config.mapTilesLight + config.mapBoxToken, { attribution: config.mapAttribution }).addTo(map);
    var authGeo = [];

    var tblResults = $('#tblResults').DataTable({ searching: false, info: false, lengthChange: false, pagingType: 'numbers', pageLength: 4, responsive: true, columns: [{ data: 'service' },{ data: 'available' },{ data: 'unavailable' }]});

    $.get('/services', function (data) { libraryServices = data; });

    ////////////////////////////////////////////
    // TYPEAHEAD
    ////////////////////////////////////////////
    $('#txtKeywords').typeahead({
        source: function (query, process) {
            return $.get('https://www.googleapis.com/books/v1/volumes?q=' + query + '&key=' + config.booksKey, function (data) {
                return process($.map(data.items, function (item, x) {
                    if (!item.saleInfo.isEbook && item.volumeInfo.industryIdentifiers) {
                        var tempisbns = { tens: [], thirteens: [] };
                        $.each(item.volumeInfo.industryIdentifiers, function (y, is) {
                            if (is.type == 'ISBN_10') tempisbns.tens.push(is.identifier);
                            if (is.type == 'ISBN_13') tempisbns.thirteens.push(is.identifier);
                        });
                        return { id: tempisbns, name: item.volumeInfo.title + (item.volumeInfo.authors ? ', ' + item.volumeInfo.authors[0] : '') };
                    };
                }));
            });
        },
        autoSelect: true
    });

    ////////////////////////////////////////////////
    // EVENT: Change textbox
    ////////////////////////////////////////////////
    $('#txtKeywords').change(function () {
        var current = $('#txtKeywords').typeahead("getActive");
        isbns = { tens: [], thirteens: [] };
        if (current) isbns = current.id;
        // let's now trigger the lookup for additional isbns ready for when the search is run
        // this uses library things thingISBN service to have a look.
        $.ajax({
            type: 'GET',
            url: '/thingISBN/' + isbns.thirteens[0],
            dataType: 'json',
            success: function (data) {
                $.each(data, function (i, isbn) {
                    if (isbn.length == 10) isbns.tens.push(isbn);
                    if (isbn.length == 13) isbns.thirteens.push(isbn);
                });
                $('#btnSearch').removeClass('disabled'); 
            }
        });
    });

    var clearResults = function() {
        $('txtKeywords').text('');
        tblResults.clear();
        clearInterval(updateResults);
        $('#found').text(0);
        $('#available').text(0);
        $('#unavailable').text(0);
        $('.progress').val(0);
        $('#btnSearch').addClass('disabled');
    };

    $('#btnClear').on('click', clearResults);

    $('#btnSearch').on('click', function () {
        clearResults();
        $('#btnClear').removeClass('disabled');
        // from the total set of isbns and services, work out the number of calls to make
        var requests = [];
        $.each(libraryServices, function (x, service) {
            $.each(isbns.thirteens, function (y, isbn) { requests.push('/availabilityByISBN/' + isbn + '?service=' + service.Name); });
        });

        var countReturns = 0;
        var available = 0;
        var unavailable = 0;
        var responses = {};
        if (libraryServices.length > 0) {
            // Firstly we want to update the UI with progress but not TOO often - set a timeout to do it every half second.
            updateResults = setInterval(function () {
                $('.progress').val((countReturns / requests.length) * 100);
                $('#found').text(unavailable + available);
                $('#available').text(available);
                $('#unavailable').text(unavailable);

                // For adding the map layers, let's only throw 5 at once.
                var count = 0;
                $.each(Object.keys(authGeo), function (i, l) {
                    if (!authGeo[l].added && count < 5) {
                        authGeo[l].added == true;
                        map.addLayer(authGeo[l].layer);
                        count++;
                    }
                });

                $.each(Object.keys(responses), function(x, s) {
                    if (tblResults.row('#' + s).length == 0) tblResults.row.add({ "DT_RowId": s, "service": s, "available": responses[s].available, "unavailable": responses[s].unavailable }).draw(true);
                    if (tblResults.row('#' + s).length > 0) tblResults.row('#' + s).data({ "service": s, "available": responses[s].available, "unavailable": responses[s].unavailable }).draw(true);
                    if (!authGeo[s]) {
                        authGeo[s] = { layer: {}, added: false };
                        $.get('/servicegeo?service=' + s, function (data) {
                            authGeo[s].layer = L.geoJSON(data);
                        });
                    }
                });
                if (countReturns == requests.length) clearInterval(updateResults);
            }, 1500);

            for (var i = 0; i < requests.length; i++) {
                (function (ind) {
                    setTimeout(function () {
                        $.get(requests[ind], function (data) {
                            countReturns++;
                            if (data && data[0] && data[0].availability) {
                                $.each(data[0].availability, function(i, a) {
                                    if (!responses[data[0].service]) responses[data[0].service] = { libraries: {}, available: 0, unavailable: 0 };
                                    if (!responses[data[0].service].libraries[a.library]) responses[data[0].service].libraries[a.library] = { available: 0, unavailable: 0 };
                                    responses[data[0].service].available = responses[data[0].service].available + a.available;
                                    responses[data[0].service].libraries[a.library].available = responses[data[0].service].libraries[a.library].available + a.available;
                                    responses[data[0].service].unavailable = responses[data[0].service].unavailable + a.unavailable;
                                    responses[data[0].service].libraries[a.library].unavailable = responses[data[0].service].libraries[a.library].unavailable + a.unavailable;
                                });
                                available = available + $.sum($.map(data[0].availability, function (av, i) { return parseInt(av.available) }));
                                unavailable = unavailable + $.sum($.map(data[0].availability, function (av, i) { return parseInt(av.unavailable) }));
                            }
                        });
                    }, 1);
                })(i);
            }
        }
    });
});