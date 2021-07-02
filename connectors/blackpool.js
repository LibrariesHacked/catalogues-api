const axios = require('axios').default
const common = require('./common')

console.log('blackpool connector loading...')

/**
 * Gets the object representing the service
 * @param {object} service
 */
exports.getService = (service) => common.getService(service)

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
  responseHoldings.url = service.Url

  const isbnSearch = `https://api.blackpool.gov.uk/live/api/library/standard/catalogsearchrest/?Term1=${isbn}&Term2=&SearchType=General&HitsToDisplay=5&LibraryFilter=&LanguageFilter=&ItemTypeFilter=&ExactMatch=false&Token=`

  let item = {}
  try {
    const isbnRequest = await axios.get(isbnSearch, { timeout: 30000 })
    if (isbnRequest?.data?.hitlistTitleInfoField && isbnRequest.data.hitlistTitleInfoField.length > 0) {
      item = isbnRequest.data.hitlistTitleInfoField[0]
    } else {
      return common.endResponse(responseHoldings)
    }
  } catch (e) {
    return common.endResponse(responseHoldings)
  }

  const titleId = item?.titleIDField

  if (titleId) {
    try {
      const titleSearch = `https://api.blackpool.gov.uk/live/api/library/standard/lookupTitleInformation/${titleId}`
      const titleRequest = await axios.get(titleSearch, { timeout: 30000 })
      if (titleRequest?.data?.callInfoField) {
        titleRequest.data.callInfoField.forEach(info => {
          const lib = service.Libraries.find(l => l[0] === info.libraryIDField)
          const copiesAvailable = info.itemInfoField.filter(i => i.homeLocationIDField === i.currentLocationIDField)
          const copiesUnAvailable = info.itemInfoField.filter(i => i.homeLocationIDField !== i.currentLocationIDField)
          responseHoldings.availability.push({ library: lib[1], available: copiesAvailable.length, unavailable: copiesUnAvailable.length })
        })
      } else {
        return common.endResponse(responseHoldings)
      }
    } catch (e) {
      return common.endResponse(responseHoldings)
    }
  } else {
    return common.endResponse(responseHoldings)
  }

  return common.endResponse(responseHoldings)
}
