const axios = require('axios')
const cheerio = require('cheerio')
const common = require('../connectors/common')
const https = require('https')

console.log('spydus connector loading...')

const SEARCH_URL = 'cgi-bin/spydus.exe/ENQ/WPAC/BIBENQ?NRECS=1&ISBN='
const LIBS_URL = 'cgi-bin/spydus.exe/MSGTRN/WPAC/COMB'

const axe = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
})

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

  try {
    const libsPageRequest = await axe.get(service.Url + LIBS_URL, {
      headers: { Cookie: 'ALLOWCOOKIES_443=1' },
      timeout: 60000
    })
    const $ = cheerio.load(libsPageRequest.data)
    $('#LOC option').each(function (idx, option) {
      if (common.isLibrary($(option).text())) responseLibraries.libraries.push($(option).text())
    })
  } catch (e) {}

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

  try {
    const itemPageRequest = await axe.get(responseHoldings.url, { timeout: 30000 })
    let $ = cheerio.load(itemPageRequest.data)
    if ($('#result-content-list').length === 0) return common.endResponse(responseHoldings)

    const availabilityUrl = $('.card-text.availability').first().find('a').attr('href')
    const availabilityRequest = await axe.get(service.Url + availabilityUrl, { timeout: 30000 })

    $ = cheerio.load(availabilityRequest.data)

    var libs = {}
    $('table tr').slice(1).each(function (i, tr) {
      var name = $(tr).find('td').eq(0).text().trim()
      var status = $(tr).find('td').eq(3).text().trim()
      if (!libs[name]) libs[name] = { available: 0, unavailable: 0 }
      status === 'Available' ? libs[name].available++ : libs[name].unavailable++
    })
    for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable })
  } catch (e) { }

  return common.endResponse(responseHoldings)
}
