
const axios = require('axios').default
const cheerio = require('cheerio')
const common = require('../connectors/common')

console.log('ibistro connector loading...')

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

  const homePage = await axios.get(service.Url + service.Home, { timeout: 60000 })
  const $ = cheerio.load(homePage.data)
  $('#library option').each((idx, option) => {
    if (common.isLibrary($(option).text())) responseLibraries.libraries.push($(option).text())
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
  responseHoldings.url = service.Url + service.Search + isbn

  let itemPage = null
  try {
    const searchPageRequest = await axios.get(responseHoldings.url, { timeout: 30000 })
    itemPage = searchPageRequest.data
  } catch (e) {
    return common.endResponse(responseHoldings)
  }

  let $ = cheerio.load(itemPage)

  if ($('form[name=hitlist]').length > 0) {
    const itemUrl = service.Url + $('form[name=hitlist]').attr('action')
    try {
      const itemPageRequest = axios.post(itemUrl, 'first_hit=1&form_type=&last_hit=2&VIEW%5E1=Details', { timeout: 30000 })
      $ = cheerio.load(itemPageRequest.data)
    } catch (e) {
      return common.endResponse(responseHoldings)
    }
  }

  var libs = {}
  var currentLib = ''
  $('tr').each((idx, tr) => {
    var libr = $(tr).find('td.holdingsheader,th.holdingsheader').eq(0).text().trim()
    if (libr === 'Copies') libr = $(tr).find('.holdingsheader_users_library').eq(0).text().trim()
    var status = $(tr).find('td').eq(3).text().trim()
    if (libr) currentLib = libr
    if (!libr && status) {
      if (!libs[currentLib]) libs[currentLib] = { available: 0, unavailable: 0 }
      service.Available.indexOf(status) > -1 ? libs[currentLib].available++ : libs[currentLib].unavailable++
    }
  })
  for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable })
  return common.endResponse(responseHoldings)
}
