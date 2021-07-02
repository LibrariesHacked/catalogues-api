
/**
 * The majority of the get service call is just returning information that's in the service
 * object from data.json.  Maintain a list here of what to return.
 * @param {object} service
 */
exports.getService = function (service) {
  return {
    code: service.Code,
    name: service.Name,
    type: service.Type,
    url: service.Url
  }
}

/**
 * Used for error handling and checking HTTP status
 * @param {*} error
 * @param {*} httpMessage
 */
exports.handleErrors = function (error, httpMessage) {
  if (httpMessage && (httpMessage.statusCode !== 200 && httpMessage.statusCode !== 302)) error = 'Web request error. Status code was ' + httpMessage.statusCode
  if (error) return true
  return false
}

/**
 * Test if a string is json
 * @param {string} str
 */
exports.isJsonString = function (str) {
  try {
    JSON.parse(str)
  } catch (e) { return false }
  return true
}

/**
 * Test if a string is a library
 * @param {string} str
 */
exports.isLibrary = function (str) {
  const nonLibraries = ['All libraries', 'All Locations', 'Select library', 'Invalid key', 'Any Library', 'ALL', 'ANY', 'HERE', 'All', 'Adult Books', 'Audio Books', 'Children/s Books', 'Fiction', 'DVDs', 'Large Print', 'Local History', 'School Libraries Collections', 'Non-Fiction', 'View Entire Collection', 'Young Adult Collection']
  let library = true
  nonLibraries.forEach(nl => { if (str.indexOf(nl) !== -1) library = false })
  return library
}

/**
 * Creates a new object to store results for the get libraries request
 * @param {object} service
 */
exports.initialiseGetLibrariesResponse = function (service) {
  const response = { service: service.Name, code: service.Code, libraries: [], start: new Date(), end: null }
  // Sometimes we have to use libraries that are hardcoded into the config
  if (service.Libraries) {
    for (const lib in service.Libraries) responseLibraries.libraries.push(lib)
  }
  return response
}

/**
 * Creates a new object to store search results for the ISBN search
 * @param {object} service
 */
exports.initialiseSearchByISBNResponse = function (service) {
  return { service: service.Name, code: service.Code, availability: [], start: new Date(), end: null }
}

/**
 * Assigns a final timestamp to a request
 * @param {*} service
 */
exports.endResponse = function (request) {
  return { ...request, end: new Date() }
}
