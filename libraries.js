const async = require('async')
const data = require('./data/data')
const libThing = require('./connectors/librarything')
const openLibrary = require('./connectors/openlibrary')

var serviceFunctions = {}
data.LibraryServices.forEach((service) => {
  if (!serviceFunctions[service.Type]) serviceFunctions[service.Type] = require('./connectors/' + service.Type)
})

exports.getServices = async (req, res) => {
  var services = data.LibraryServices
    .filter((service) => (service.Type !== '' && (!req.query.service || service.Name === req.query.service)))
    .map((service) => {
      return async () => {
        return serviceFunctions[service.Type].getService(service)
      }
    })

  services = await async.parallel(services)

  res.send(services)
}

exports.getServiceGeo = (req, res) => {
  var servicegeo = null
  data.LibraryServices.some((s, i) => {
    if (req.query.service === s.Code || req.query.service === s.Name) {
      servicegeo = require('./data/geography/' + s.Code)
      return true
    }
  })
  res.send(servicegeo)
}

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

exports.thingISBN = async (req, res) => {
  var thingData = await libThing.thingISBN(req.params.isbn)
  res.send(thingData.isbns)
}

exports.openLibrarySearch = async (req, res) => {
  var openLibData = await openLibrary.search(req.query.q)
  res.send(openLibData)
}

exports.testIsbnSearch = (req, res) => {
  var searches = data.LibraryServices
    .filter((service) => {
      return (service.Type !== '' && (!req.query.service || service.Name === req.query.service || service.Code === req.query.service))
    })
    .map((service) => {
      return async () => {
        var response = await serviceFunctions[service.Type].searchByISBN(service.TestISBN, service)
        if (response.availability.length === 0) console.log('None found: ' + JSON.stringify(response))
        return response
      }
    })
  async.series(searches)
}
