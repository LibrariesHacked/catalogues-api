$(function () {

    $.sum = function (arr) {
        var r = 0;
        $.each(arr, function (i, v) { r += v; });
        return r;
    }

    var libraryServices = [];
    var isbns = { tens: [], thirteens: [] };
    var getData, updateResults;
    var map = L.map('map', { zoomControl: false, minZoom: 4 })
        .setView([52.6, -2.5], 7)
        .addLayer(L.tileLayer(config.mapTilesLight + config.mapBoxToken, { attribution: config.mapAttribution }));
    var layers = L.featureGroup([]).addTo(map);
    var authGeo = [];

    var tblResults = $('#tblResults').DataTable({ searching: false, info: false, lengthChange: false, pagingType: 'numbers', pageLength: 4, responsive: true, columns: [{ data: 'service' }, { data: 'available' }, { data: 'unavailable' }] });

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

    var clearResults = function () {
        $('.progress').val(0);
        $('#txtKeywords').text('');
        $('#found, #available, #unavailable').text(0);
        $('#btnSearch').addClass('disabled');
        tblResults.clear().draw();
        layers.clearLayers();
        clearInterval(updateResults);
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

        var countReturns = 0, available = 0, unavailable = 0, responses = {};
        if (libraryServices.length > 0) {

            var reqInd = 0, geoAdded = 0;

            ///////////////////////////////////
            // Interval: getData
            // 
            ///////////////////////////////////
            getData = setInterval(function () {

                // 
                if (requests[reqInd]) {
                    $.get(requests[reqInd], function (data) {
                        countReturns++;
                        if (data && data[0] && data[0].availability) {
                            $.each(data[0].availability, function (i, a) {
                                if (!authGeo[data[0].service]) authGeo[data[0].service] = { layer: {}, requested: false, downloaded: false, displayed: false };
                                if (!responses[data[0].service]) responses[data[0].service] = { libraries: {}, available: 0, unavailable: 0, code: data[0].code, displayed: false };
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
                }
                reqInd++;

                // Trigger a map layer call.
                Object.keys(authGeo).some(function (s, i) {
                    if (!authGeo[s].requested && responses[s]) {
                        authGeo[s].requested = true;
                        geoAdded++;
                        $.get('/geography/Simplified_' + responses[s].code + '.json', function (data) {
                            authGeo[s].layer = L.geoJSON(data, {
                                style: function (feature) {
                                    return { weight: 1, color: '#CCC', fillColor: '#5CB85C' };
                                }
                            });
                            authGeo[s].downloaded = true;
                        });
                        return true;
                    }
                });

                // End the interval.
                if (countReturns >= requests.length && geoAdded >= Object.keys(responses).length) clearInterval(getData);
            }, 10);

            ///////////////////////////////////
            // Interval: updateResults
            // 
            ///////////////////////////////////
            updateResults = setInterval(function () {
                // Update the current display of counts.
                $('#progressPercentage').text(((countReturns / requests.length) * 100).toFixed(2) + '%');
                $('.progress').val((countReturns / requests.length) * 100);
                $('#found').text(unavailable + available);
                $('#available').text(available);
                $('#unavailable').text(unavailable);

                // Add a map layer if available.
                Object.keys(authGeo).some(function (l, i) {
                    if (authGeo[l].downloaded && !authGeo[l].displayed) {
                        layers.addLayer(authGeo[l].layer);
                        authGeo[l].displayed = true;
                        map.fitBounds(layers.getBounds());
                        return true;
                    }
                });

                // Update the table.
                $.each(Object.keys(responses), function (x, s) {
                    if (!responses[s].displayed) {
                        if (tblResults.row('#' + s).length == 0) tblResults.row.add({ "DT_RowId": s, "service": s, "available": responses[s].available, "unavailable": responses[s].unavailable }).draw();
                        if (tblResults.row('#' + s).length > 0) tblResults.row('#' + s).data({ "service": s, "available": responses[s].available, "unavailable": responses[s].unavailable }).draw();
                    }
                });

                // End the interval.
                if (countReturns >= requests.length && geoAdded >= Object.keys(responses).length) clearInterval(updateResults);
            }, 4000);
        }
    });
});