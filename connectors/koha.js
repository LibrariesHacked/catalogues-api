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
exports.getService = (service) => common.getService(service)

/**
 * Gets the libraries in the service based upon possible search and filters within the library catalogue
 * @param {object} service
 */
exports.getLibraries = async function (service) {
  const responseLibraries = common.initialiseGetLibrariesResponse(service)

  const url = service.Url + (LIBS_URL.replace('[MULTIBRANCH]', service.MultiBranchLimit ? 'multibranchlimit=' + service.MultiBranchLimit + '&' : ''))

  let $ = null
  try {
    const libraryPageRequest = await axios.get(url, { timeout: 60000 })
    $ = cheerio.load(libraryPageRequest.data)
  } catch (e) {
    return common.endResponse(responseLibraries)
  }

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
  responseHoldings.url = service.Url

  let $ = null
  try {
    const searchPageRequest = await axios.get(service.Url + CAT_URL + isbn, { timeout: 30000 })
    $ = cheerio.load(searchPageRequest.data, { normalizeWhitespace: true, xmlMode: true })
    responseHoldings.url = $('link').first().text()
  } catch (e) {
    return common.endResponse(responseHoldings)
  }

  var bibLink = $('guid').text()
  if (!bibLink) return common.endResponse(responseHoldings)

  responseHoldings.url = bibLink

  try {
    const itemPageRequest = await axios.get(bibLink + '&viewallitems=1', { timeout: 30000 })
    $ = cheerio.load(itemPageRequest.data)
  } catch (e) {
    return common.endResponse(responseHoldings)
  }

  const libs = {}
  $('#holdingst tbody, .holdingst tbody').find('tr').each((idx, table) => {
    var lib = $(table).find('td.location span span').first().text().trim()
    if (!libs[lib]) libs[lib] = { available: 0, unavailable: 0 }
    $(table).find('td.status span').text().trim() === 'Available' ? libs[lib].available++ : libs[lib].unavailable++
  })
  for (var l in libs) responseHoldings.availability.push({ library: l, available: libs[l].available, unavailable: libs[l].unavailable })

  return common.endResponse(responseHoldings)
}
