$(function () {
    var libraryServices = [];
    var isbn = '';

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
                        $.each(item.volumeInfo.industryIdentifiers, function (y, is) { if (is.type == 'ISBN_13') isbn = is.identifier });
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
                        $('#found').text(parseInt($('#found').text()) + data[0].availability.length);
                        $('#available').text(parseInt($('#available').text()) + data[0].availability.length);
                        $('#unavailable').text(parseInt($('#found').text()) + data[0].availability.length);
                    } 
                });
            });
        }
    });
});