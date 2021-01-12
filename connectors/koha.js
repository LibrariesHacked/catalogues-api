const axios = require('axios').default
const cheerio = require('cheerio')
const common = require('../connectors/common')

console.log('koha connector loading...')

const CAT_URL = 'cgi-bin/koha/opac-search.pl?format=rss2&idx=nb&q='
const LIBS_URL = 'cgi-bin/koha/opac-search.pl?[MULTIBRANCH]do=Search&expand=holdingbranch#holdingbranch_id'

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

  const url = service.Url + (service.MultiBranchLimit ? LIBS_URL.replace('[MULTIBRANCH]', 'multibranchlimit=' + service.MultiBranchLimit + '&') : LIBS_URL.replace('[MULTIBRANCH]', ''))
  const libraryPageRequest = await axios.get(url, { timeout: 60000 })
  const $ = cheerio.load(libraryPageRequest.data)
  $('div#location select#branchloop option').each((idx, option) => {
    if (common.isLibrary($(option).text())) responseLibraries.libraries.push($(this).text().trim())
  })
  $('li#holdingbranch_id ul li span.facet-label').each((idx, label) => {
    responseLibraries.libraries.push($(label).text().trim())
  })
  $('li#homebranch_id ul li span.facet-label').each((idx, label) => {
    responseLibraries.libraries.push($(label).text().trim())
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
  responseHoldings.url = service.Url + CAT_URL + isbn

  const searchPageRequest = await axios.get(responseHoldings.url, { timeout: 30000 })
  let $ = cheerio.load(searchPageRequest.data, { normalizeWhitespace: true, xmlMode: true })
  var bibLink = $('guid').text()
  if (!bibLink) return common.endResponse(responseHoldings)

  const itemPageRequest = await axios.get(bibLink + '&viewallitems=1', { timeout: 30000 })
  $ = cheerio.load(itemPageRequest.data)
  const libs = {}
  $('#holdingst tbody').find('tr').each((idx, table) => {
    var lib = $(table).find('td.location span span').text().trim()
    if (!libs[lib]) libs[lib] = { available: 0, unavailable: 0 }
    $(table).find('td.status span').text().trim() === 'Available' ? libs[lib].available++ : libs[lib].unavailable++
  })
  for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable })

  return common.endResponse(responseHoldings)
}
