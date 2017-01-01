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
    L.tileLayer(config.mapTilesLight + config.mapBoxToken, { attribution: config.mapAttribution}).addTo(map);

    var tblResults = $('#tblResults').DataTable();
    

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

    $('#btnSearch').on('click', function () {
        // Clear existing stuff.
        clearInterval(updateResults);
        $('#found').text(0);
        $('#available').text(0);
        $('#unavailable').text(0);
        $('.progress').val(0);
        $('#btnSearch').addClass('disabled'); 

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
                $.each(Object.keys(responses), function(x, s) {
                    tblResults.row.add(x,0,1).draw(false);
                });
                if (countReturns == request.length) clearInterval(updateResults);
            }, 500);

            for (var i = 0; i < requests.length; i++) {
                (function (ind) {
                    setTimeout(function () {
                        $.get(requests[ind], function (data) {
                            countReturns++;
                            if (data && data[0] && data[0].availability) {
                                if (!responses[data[0].service]) responses[data[0].service] = { libraries: {} };
                                $.each(data[0].availability, function(i, a) {
                                    if (!responses[data[0].service].libraries[a.library]) responses[data[0].service].libraries[a.library] = { available: 0, unavailable: 0 };
                                    responses[data[0].service].libraries[a.library].available = responses[data[0].service].libraries[a.library].available + a.available;
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