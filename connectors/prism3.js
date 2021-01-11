
const axios = require('axios')
const cheerio = require('cheerio')
const common = require('../connectors/common')

console.log('prism3 connector loading...')

const HEADER = { 'Content-Type': 'text/xml; charset=utf-8' }

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

  const advancedSearchPageRequest = await axios.get(service.Url + 'advancedsearch?target=catalogue', { timeout: 60000 })

  const $ = cheerio.load(advancedSearchPageRequest.data)
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

  const searchRequest = await axios.get(service.Url + 'items.json?query=' + isbn, { headers: HEADER, timeout: 30000 })

  if (searchRequest.data.length === 0) return common.endResponse(responseHoldings)
  var itemUrl = Object.keys(searchRequest.data)[2]

  const itemRequest = await axios.get(itemUrl, { headers: HEADER, timeout: 30000 })
  const $ = cheerio.load(itemRequest.data)
  $('#availability').find('ul.options li').each((idx, li) => {
    var libr = { library: $(li).find('h3 span span').text().trim(), available: 0, unavailable: 0 }
    $(li).find('div.jsHidden table tbody tr').each((i, tr) => {
      service.Available.indexOf($(tr).find('td.item-status span').text().trim()) > -1 ? libr.available++ : libr.unavailable++
    })
    responseHoldings.availability.push(libr)
  })

  return common.endResponse(responseHoldings)
}
