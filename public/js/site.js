$(function () {

    $.sum = function (arr) {
        var r = 0;
        $.each(arr, function (i, v) { r += v; });
        return r;
    }

    var libraryServices = [];
    var isbns = { 10s:[], 13s: [] };

    $.get('/services', function (data) { libraryServices = data; });

    ////////////////////////////////////////////
    // TYPEAHEAD
    ////////////////////////////////////////////
    $('#txtKeywords').typeahead({
        source: function (query, process) {
            return $.get('https://www.googleapis.com/books/v1/volumes?q=' + query + '&key=' + config.booksKey, function (data) {
                return process($.map(data.items, function (item, x) {
                    if (item.volumeInfo.industryIdentifiers) {
                        var tempisbns = { 10s:[], 13s: [] };
                        $.each(item.volumeInfo.industryIdentifiers, function (y, is) {
                            if (is.type == 'ISBN_10') tempisbns.10s.push(is.identifier);
                            if (is.type == 'ISBN_13') tempisbns.13s.push(is.identifier);
                        });
                        return { id: tempisbns, name: item.volumeInfo.title + ', ' + item.volumeInfo.authors[0] };
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
        if (current) { $('#btnSearch').removeClass('disabled'); isbns = current.id; }
        // let's now trigger the lookup for additional isbns ready for when the search is run
        //$.ajax({ type: 'GET',
        	//	url: URL,
        //		dataType: 'xml',
        	//	contentType: 'application/xml; charset=utf-8',
        //		success: function (data) {
        //			$.each($(data).find('isbn'), function(data) {
        //				// 
        //			};
        	//	}
        	//});
    });

    $('#btnSearch').on('click', function () {
        // Clear existing stuff.
        $('#found').text(0);
        $('#available').text(0);
        $('#unavailable').text(0);
        $('.progress-bar').css('width', '0%');
        
        
        // from the total set of isbns and services, work out the number of calls to make
        var requests =  [];
        $.each(libraryServices, function (x, service) {
        		$.each(isbns.13s, function (y, isbn) { requests.push('/availabilityByISBN/' + isbn + '?service=' + service.Name); });		 
        });

        var countReturns = 0;
        if (libraryServices.length > 0 && isbn != '') {
            $.each(requests, function (x, url) {
                $.get(url, function (data) {
                    countReturns++;
                    $('.progress-bar').css('width', ((countReturns / requests.length) * 100) + '%');
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