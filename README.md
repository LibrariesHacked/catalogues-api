# Catalogue NodeWS
A Node.JS web service project for searching UK public library catalogues (using the OPAC)

# data.json
A list of UK public library authorities is included in the data.json file.  This has the library authority name and the *type* of library service, along with associated library service specific implementation required to search that service e.g. the web URL. 

Over time this service will implement a number of different methods for interacting with the library services.

# Using the web service

## services
/services

Returns selected(end user) contents of the data.json file - useful if wanting to create an interface that lists the library authorities which can then be used in a search filter (see below).

## availabilityByISBN
/availabilityByISBN/:isbn

Returns a data object representing the libraries and number of available/unavailable copies of the relevant book.

Filter: by appending authority names to the URL the results can be filtered e.g. /availabilityByISBN/1234567891012?library=Gloucestershire