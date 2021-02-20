const axios = require('axios').default
const common = require('./common')

console.log('blackpool connector loading...')

/**
 * Gets the object representing the service
 * @param {object} service
 */
exports.getService = (service) => { return common.getService(service) }

/**
 * Gets the libraries in the service based upon possible search and filters within the library catalogue
 * @param {object} service
 */
exports.getLibraries = async function (service) {
  const responseLibraries = common.initialiseGetLibrariesResponse(service)
  return common.endResponse(responseLibraries)
}

/**
 * Retrieves the availability summary of an ISBN by library
 * @param {string} isbn
 * @param {object} service
 */
exports.searchByISBN = async function (isbn, service) {
  const responseHoldings = common.initialiseSearchByISBNResponse(service)

  return common.endResponse(responseHoldings)
}
