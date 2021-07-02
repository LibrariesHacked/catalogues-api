const async = require('async')
const data = require('./data/data')
const libThing = require('./connectors/librarything')
const openLibrary = require('./connectors/openlibrary')

// Loads all the connectors that are currently referenced in data.json
var serviceFunctions = {}
data.LibraryServices.forEach((service) => {
  if (!serviceFunctions[service.Type]) serviceFunctions[service.Type] = require('./connectors/' + service.Type)
})

/**
 * Gets library service data
 * @param {Object} req The request
 * @param {Object} res The response
 */
exports.getServices = async (req, res) => {
  var services = data.LibraryServices
    .filter((service) => (service.Type !== '' && (!req.query.service || service.Name === req.query.service || service.Code === req.query.service)))
    .map((service) => {
      return async () => {
        return serviceFunctions[service.Type].getService(service)
      }
    })

  services = await async.parallel(services)

  res.send(services)
}

/**
 * Gets individual library service point data
 * @param {Object} req The request
 * @param {Object} res The response
 */
exports.getLibraries = async (req, res) => {
  var searches = data.LibraryServices
    .filter((service) => {
      return (service.Type !== '' && (!req.query.service || service.Name === req.query.service || service.Code === req.query.service))
    })
    .map((service) => {
      return async () => {
        var response = await serviceFunctions[service.Type].getLibraries(service)
        return response
      }
    })

  var responses = await async.parallel(searches)
  res.send(responses)
}

/**
 * Gets ISBN availability information for library service points
 * @param {Object} req The request
 * @param {Object} res The response
 */
exports.isbnSearch = async (req, res) => {
  var searches = data.LibraryServices
    .filter((service) => {
      return (service.Type !== '' && (!req.query.service || service.Name === req.query.service || service.Code === req.query.service))
    })
    .map((service) => {
      return async () => {
        var response = await serviceFunctions[service.Type].searchByISBN(req.params.isbn, service)
        return response
      }
    })

  var responses = await async.parallel(searches)
  res.send(responses)
}

/**
 * Gets results from the library thing thingISBN service
 * @param {Object} req The request
 * @param {Object} res The response
 */
exports.thingISBN = async (req, res) => {
  var thingData = await libThing.thingISBN(req.params.isbn)
  res.send(thingData.isbns)
}

/**
 * Gets results from open libraries free text search
 * @param {Object} req The request
 * @param {Object} res The response
 */
exports.openLibrarySearch = async (req, res) => {
  var openLibData = await openLibrary.search(req.query.q)
  res.send(openLibData)
}

/**
 * Runs through tests for the ISBN search and reports where no copies are found for the test ISBNs
 * @param {Object} req The request
 * @param {Object} res The response
 */
exports.testIsbnSearch = async (req, res) => {
  var searches = data.LibraryServices
    .filter((service) => {
      return (service.Type !== '' && (!req.query.service || service.Name === req.query.service || service.Code === req.query.code))
    })
    .map((service) => {
      return async () => {
        var response = await serviceFunctions[service.Type].searchByISBN(service.TestISBN, service)
        if (response.availability.length === 0) console.log('None found. ' + JSON.stringify(response))
        return response
      }
    })
  await async.parallel(searches)
  res.send({})
}
