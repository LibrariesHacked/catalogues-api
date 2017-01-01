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
        $('.progress-bar').val(0);
        $('#btnSearch').addClass('disabled'); 

        // from the total set of isbns and services, work out the number of calls to make
        var requests = [];
        $.each(libraryServices, function (x, service) {
            $.each(isbns.thirteens, function (y, isbn) { requests.push('/availabilityByISBN/' + isbn + '?service=' + service.Name); });
        });

        var countReturns = 0;
        var available = 0;
        var unavailable = 0;
        if (libraryServices.length > 0) {
            // Firstly we want to update the UI with progress but not TOO often - set a timeout to do it every second and a half.
            updateResults = setInterval(function () {
                $('.progress-bar').val((countReturns / requests.length) * 100);
                $('#found').text(unavailable + available);
                $('#available').text(available);
                $('#unavailable').text(unavailable);
                if (countReturns == request.length) clearInterval(updateResults);
            }, 1500);

            for (var i = 0; i < requests.length; i++) {
                (function (ind) {
                    setTimeout(function () {
                        $.get(requests[ind], function (data) {
                            countReturns++;
                            if (data && data[0] && data[0].availability) {
                                available = available + $.sum($.map(data[0].availability, function (av, i) { return parseInt(av.available) }));
                                unavailable = unavailable + $.sum($.map(data[0].availability, function (av, i) { return parseInt(av.unavailable) }));
                            }
                        });
                    }, 5);
                })(i);
            }
        }
    });
});