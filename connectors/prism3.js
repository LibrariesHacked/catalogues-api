
const axios = require('axios')
const cheerio = require('cheerio')
const common = require('../connectors/common')

console.log('prism3 connector loading...')

const HEADER = { 'Content-Type': 'text/xml; charset=utf-8' }
const DEEP_LINK = 'items?query='

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
    const advancedSearchPageRequest = await axios.get(service.Url + 'advancedsearch?target=catalogue', { timeout: 60000 })
    $ = cheerio.load(advancedSearchPageRequest.data)
  } catch (e) {
    return common.endResponse(responseLibraries)
  }

  $('#locdd option').each((idx, option) => {
    if ($(option).text() !== '') responseLibraries.libraries.push($(option).text())
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
  responseHoldings.url = service.Url + DEEP_LINK + isbn

  let $ = null
  try {
    const searchRequest = await axios.get(service.Url + 'items.json?query=' + isbn, { headers: HEADER, timeout: 30000 })
    if (searchRequest.data.length === 0) return common.endResponse(responseHoldings)
    const itemUrl = Object.keys(searchRequest.data)[2]
    const itemRequest = await axios.get(itemUrl, { headers: HEADER, timeout: 30000 })
    $ = cheerio.load(itemRequest.data)
  } catch (e) {
    return common.endResponse(responseHoldings)
  }

  $('#availability').find('ul.options li').each((idx, li) => {
    var libr = { library: $(li).find('h3 span span').text().trim(), available: 0, unavailable: 0 }
    $(li).find('div.jsHidden table tbody tr').each((i, tr) => {
      service.Available.indexOf($(tr).find('td.item-status span').text().trim()) > -1 ? libr.available++ : libr.unavailable++
    })
    responseHoldings.availability.push(libr)
  })

  return common.endResponse(responseHoldings)
}
