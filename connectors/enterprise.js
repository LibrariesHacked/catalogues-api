const axios = require('axios').default
const cheerio = require('cheerio')
const common = require('../connectors/common')

console.log('enterprise connector loading...')

const SEARCH_URL = 'search/results?qu='
const ITEM_URL = 'search/detailnonmodal/ent:[ILS]/one'
const HEADER = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Safari/537.36 Edge/13.10586' }
const HEADER_POST = { 'X-Requested-With': 'XMLHttpRequest' }

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

  let $ = null
  try {
    const advancedPage = await axios.get(service.Url + 'search/advanced', { timeout: 30000 })
    $ = cheerio.load(advancedPage.data)
  } catch (e) {
    return common.endResponse(responseLibraries)
  }

  $('#libraryDropDown option').each((idx, lib) => {
    const name = $(lib).text()
    if (common.isLibrary(name) && name.indexOf(service.LibraryNameFilter) !== -1) responseLibraries.libraries.push(name)
  })
  return common.endResponse(responseLibraries)
}

/**
 * Retrieves the availability summary of an ISBN by library
 * @param {string} isbn
 * @param {object} service
 */
exports.searchByISBN = async function (isbn, service) {
  const responseHoldings = common.initialiseSearchByISBNResponse(service)
  responseHoldings.url = service.Url + SEARCH_URL + isbn
  let itemPage = ''
  let availabilityJson = null

  let itemId = null
  let $ = null
  let deepLinkPageUrl = null
  try {
    // We could also use RSS https://wales.ent.sirsidynix.net.uk/client/rss/hitlist/ynysmon_en/qu=9780747538493
    const deepLinkPageRequest = await axios.get(responseHoldings.url, { headers: HEADER, timeout: 30000 })
    itemId = deepLinkPageRequest.config.url.substring(deepLinkPageRequest.config.url.lastIndexOf('ent:') + 4, deepLinkPageRequest.config.url.lastIndexOf('/one')) || ''
    $ = cheerio.load(deepLinkPageRequest.data)
    deepLinkPageUrl = deepLinkPageRequest.config.url
    if (itemId === '') return common.endResponse(responseHoldings)
    itemPage = deepLinkPageRequest.data
  } catch (e) {
    return common.endResponse(responseHoldings)
  }

  if (deepLinkPageUrl.lastIndexOf('ent:') === -1) {
    // In this situation we're probably still on the search page (there may be duplicate results).
    if ($('#da0').attr('value')) itemId = $('#da0').attr('value').substring($('#da0').attr('value').lastIndexOf('ent:') + 4) || ''
    if (itemId === '') return common.endResponse(responseHoldings)
    const itemPageUrl = service.Url + ITEM_URL.replace('[ILS]', itemId.split('/').join('$002f'))
    try {
      const itemPageRequest = await axios.get(itemPageUrl, { timeout: 30000 })
      itemPage = itemPageRequest.data
    } catch (e) {
      return common.endResponse(responseHoldings)
    }
  }

  // Availability information may already be part of the page.
  var matches = /parseDetailAvailabilityJSON\(([\s\S]*?)\)/.exec(itemPage)
  if (matches && matches[1] && common.isJsonString(matches[1])) {
    availabilityJson = JSON.parse(matches[1])
  }

  if (availabilityJson === null && service.AvailabilityUrl) {
    // e.g. /search/detailnonmodal.detail.detailavailabilityaccordions:lookuptitleinfo/ent:$002f$002fSD_ILS$002f0$002fSD_ILS:548433/ILS/0/true/true?qu=9780747538493&d=ent%3A%2F%2FSD_ILS%2F0%2FSD_ILS%3A548433%7E%7E0&ps=300
    const availabilityUrl = service.Url + service.AvailabilityUrl.replace('[ITEMID]', itemId.split('/').join('$002f'))
    try {
      const availabilityPageRequest = await axios.post(availabilityUrl, {}, { headers: HEADER_POST, timeout: 30000 })
      const availabilityResponse = availabilityPageRequest.data
      if (availabilityResponse.ids || availabilityResponse.childRecords) availabilityJson = availabilityResponse
    } catch (e) {
      return common.endResponse(responseHoldings)
    }
  }

  if (availabilityJson?.childRecords) {
    const libs = {}
    $(availabilityJson.childRecords).each(function (i, c) {
      const name = c.LIBRARY
      const status = c.SD_ITEM_STATUS
      if (!libs[name]) libs[name] = { available: 0, unavailable: 0 }
      service.Available.indexOf(status) > 0 ? libs[name].available++ : libs[name].unavailable++
    })
    for (var lib in libs) responseHoldings.availability.push({ library: lib, available: libs[lib].available, unavailable: libs[lib].unavailable })
    return common.endResponse(responseHoldings)
  }

  if (availabilityJson?.ids) {
    $ = cheerio.load(itemPage)
    var libs = {}
    $('.detailItemsTableRow').each(function (index, elem) {
      var name = $(this).find('td').eq(0).text().trim()
      var bc = $(this).find('td div').attr('id').replace('availabilityDiv', '')
      if (bc && availabilityJson.ids && availabilityJson.ids.length > 0 && availabilityJson.strings && availabilityJson.ids.indexOf(bc) !== -1) {
        var status = availabilityJson.strings[availabilityJson.ids.indexOf(bc)].trim()
        if (!libs[name]) libs[name] = { available: 0, unavailable: 0 }
        service.Available.indexOf(status) > 0 ? libs[name].available++ : libs[name].unavailable++
      }
    })
    for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable })
    return common.endResponse(responseHoldings)
  }

  if (service.TitleDetailUrl) {
    var titleUrl = service.Url + service.TitleDetailUrl.replace('[ITEMID]', itemId.split('/').join('$002f'))
    try {
      const titleDetailRequest = await axios.post(titleUrl, {}, { headers: HEADER_POST, timeout: 30000 })
      const titles = titleDetailRequest.data
      const libs = {}
      $(titles.childRecords).each(function (i, c) {
        const name = c.LIBRARY
        const status = c.SD_ITEM_STATUS
        if (!libs[name]) libs[name] = { available: 0, unavailable: 0 }
        service.Available.indexOf(status) > 0 ? libs[name].available++ : libs[name].unavailable++
      })
      for (var lib in libs) responseHoldings.availability.push({ library: lib, available: libs[lib].available, unavailable: libs[lib].unavailable })
    } catch (e) {
      return common.endResponse(responseHoldings)
    }
  }

  return common.endResponse(responseHoldings)
}
