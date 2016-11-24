$(function () {

    $.sum = function (arr) {
        var r = 0;
        $.each(arr, function (i, v) { r += v; });
        return r;
    }

    var libraryServices = [];
    var isbn = '';
    var isbn13s = [];
    var isbn10s = [];

    $.get('/services', function (data) { libraryServices = data; });

    ////////////////////////////////////////////
    // TYPEAHEAD
    ////////////////////////////////////////////
    $('#txtKeywords').typeahead({
        source: function (query, process) {
            return $.get('https://www.googleapis.com/books/v1/volumes?q=' + query + '&key=' + config.booksKey, function (data) {
                return process($.map(data.items, function (item, x) {
                    if (item.volumeInfo.industryIdentifiers) {
                        var isbn = '';
                        var isbns = [];
                        $.each(item.volumeInfo.industryIdentifiers, function (y, is) {
                            if (is.type == 'ISBN_10') {
                                isbn10s.push = is.identifier;
                            }
                            if (is.type == 'ISBN_13') {
                                isbn = is.identifier;
                                isbn13s.push = is.identifier;
                            }
                        });
                        return { id: isbn, name: item.volumeInfo.title + ', ' + item.volumeInfo.authors[0] }
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
        if (current) { $('#btnSearch').removeClass('disabled'); isbn = current.id; }
        // let's now trigger the lookup for additional isbns

    });

    $('#btnSearch').on('click', function () {
        // Clear existing stuff.
        $('#found').text(0);
        $('#available').text(0);
        $('#unavailable').text(0);
        $('.progress-bar').css('width', '0%');
        var countReturns = 0;
        if (libraryServices.length > 0 && isbn != '') {
            $.each(libraryServices, function (x, service) {
                $.get('/availabilityByISBN/' + isbn + '?service=' + service.Name, function (data) {
                    countReturns++;
                    $('.progress-bar').css('width', ((countReturns / libraryServices.length) * 100) + '%');
                    if (data && data[0] && data[0].availability) {
                        var available = $.sum($.map(data[0].availability, function (av, i) { return parseInt(av.available) }));
                        var unavailable = $.sum($.map(data[0].availability, function (av, i) { return parseInt(av.unavailable) }));
                        $('#found').text(parseInt($('#found').text()) + available + unavailable);
                        $('#available').text(parseInt($('#available').text()) + available);
                        $('#unavailable').text(parseInt($('#unavailable').text()) + unavailable);
                    }
                });
            });
        }
    });
});