# catalogue-ws
a Node.JS web service project for searching uk public library catalogues (using the OPAC)

## data.json
a list of UK public library authorities is included in the data.json file.  This has the library authority name and the *type* of library service, along with associated library service specific implementation required to search that service e.g. the web URL. 

over time this service will implement a number of different methods for interacting with the library services.

# documentation

## services
/services

returns the contents of the data.json - useful if wanting to create an interface that lists the library authorities which can then be used in a filter (see below).

## availabilityByISBN
/availabilityByISBN/:isbn

returns a data object representing the libraries and number of available/unavailable copies of the relevant book.

filter: by appending authority names to the URL the results can be filtered e.g. /availabilityByISBN/1234567891012?library=Gloucestershire