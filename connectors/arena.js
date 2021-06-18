
const xml2js = require('xml2js')
const cheerio = require('cheerio')
const querystring = require('querystring')

const axios = require('axios').default
const axiosCookieJarSupport = require('axios-cookiejar-support').default
const tough = require('tough-cookie')
axiosCookieJarSupport(axios)
const cookieJar = new tough.CookieJar()
axios.defaults.jar = cookieJar
axios.defaults.withCredentials = true

const common = require('../connectors/common')

console.log('arena connector loading...')

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

  // Sometimes we have to use libraries that are hardcoded into the config
  if (service.Libraries) {
    for (const lib in service.Libraries) responseLibraries.libraries.push(lib)
    return common.endResponse(responseLibraries)
  }

  // Get the advanced search page
  let advancedSearchResponse = null
  try {
    advancedSearchResponse = await axios.get(service.Url + service.AdvancedUrl)
  } catch (e) {
    common.endResponse(responseLibraries)
  }

  // The advanced search page may have libraries listed on it
  let $ = cheerio.load(advancedSearchResponse.data)
  if ($('.arena-extended-search-branch-choice option').length > 1) {
    $('.arena-extended-search-branch-choice option').each(function () {
      if (common.isLibrary($(this).text())) responseLibraries.libraries.push($(this).text())
    })
    return common.endResponse(responseLibraries)
  }

  // If not we'll need to call a portlet to get the data
  const headers = { Accept: 'text/xml', 'Wicket-Ajax': true, 'Wicket-FocusedElementId': 'id__extendedSearch__WAR__arenaportlet____e', 'Content-Type': 'application/x-www-form-urlencoded' }
  const url = service.Url + service.LibrariesUrl
  let js = null
  try {
    const responseHeaderRequest = await axios.post(url, querystring.stringify({ 'organisationHierarchyPanel:organisationContainer:organisationChoice': service.OrganisationId }), { headers: headers })
    js = await xml2js.parseStringPromise(responseHeaderRequest.data)
  } catch (e) {
    common.endResponse(responseLibraries)
  }

  // Parse the results of the request
  if (js && js !== 'Undeployed' && js['ajax-response'] && js['ajax-response'].component) {
    $ = cheerio.load(js['ajax-response'].component[0]._)
    $('option').each(function () {
      if (common.isLibrary($(this).text())) responseLibraries.libraries.push($(this).text())
    })
  }
  return common.endResponse(responseLibraries)
}

/**
 * Retrieves the availability summary of an ISBN by library
 * @param {string} isbn
 * @param {object} service
 */
exports.searchByISBN = async function (isbn, service) {
  const responseHoldings = common.initialiseSearchByISBNResponse(service)

  let bookQuery = (service.SearchType !== 'Keyword' ? service.ISBNAlias + '_index:' + isbn : isbn)
  if (service.OrganisationId) bookQuery = 'organisationId_index:' + service.OrganisationId + '+AND+' + bookQuery
  responseHoldings.url = service.Url + service.SearchUrl.replace('[BOOKQUERY]', bookQuery)

  let searchResponse = null
  try {
    searchResponse = await axios.get(responseHoldings.url, { timeout: 20000, jar: true, rejectUnauthorized: true })
  } catch (e) {
    return common.endResponse(responseHoldings)
  }

  // No item found
  if (!searchResponse || !searchResponse.data || (searchResponse.data && searchResponse.data.lastIndexOf('search_item_id') === -1)) return common.endResponse(responseHoldings)

  // Call to the item page
  const pageText = searchResponse.data.replace(/\\x3d/g, '=').replace(/\\x26/g, '&')
  let itemId = pageText.substring(pageText.lastIndexOf('search_item_id=') + 15)
  itemId = itemId.substring(0, itemId.indexOf('&'))
  const itemUrl = service.Url + service.ItemUrl.replace('[ARENANAME]', service.ArenaName).replace('[ITEMID]', itemId)

  let $ = null
  try {
    const itemPageResponse = await axios.get(itemUrl, { rejectUnauthorized: true, timeout: 20000, headers: { Connection: 'keep-alive' }, jar: true })
    $ = cheerio.load(itemPageResponse.data)
  } catch (e) {
    return common.endResponse(responseHoldings)
  }

  if ($('.arena-availability-viewbranch').length > 0) { // If the item holdings are available immediately on the page
    $('.arena-availability-viewbranch').each(function () {
      var libName = $(this).find('.arena-branch-name span').text()
      var totalAvailable = $(this).find('.arena-availability-info span').eq(0).text().replace('Total ', '')
      var checkedOut = $(this).find('.arena-availability-info span').eq(1).text().replace('On loan ', '')
      if (libName) responseHoldings.availability.push({ library: libName, available: ((totalAvailable ? parseInt(totalAvailable) : 0) - (checkedOut ? parseInt(checkedOut) : 0)), unavailable: (checkedOut !== '' ? parseInt(checkedOut) : 0) })
    })
    return common.endResponse(responseHoldings)
  }

  // Get the item holdings widget
  const itemPortletHeader = { Accept: 'text/xml', 'Wicket-Ajax': true }
  const itemPortletUrl = service.Url + service.HoldingsPanelUrl

  try {
    var itemPortletResponse = await axios.get(itemPortletUrl, { rejectUnauthorized: true, headers: itemPortletHeader, timeout: 20000, jar: true })
    var js = await xml2js.parseStringPromise(itemPortletResponse.data)
    if (!js['ajax-response'] || !js['ajax-response'].component) return common.endResponse(responseHoldings)
    $ = cheerio.load(js['ajax-response'].component[0]._)
  } catch (e) {
    return common.endResponse(responseHoldings)
  }

  if ($('.arena-holding-nof-total, .arena-holding-nof-checked-out, .arena-holding-nof-available-for-loan').length > 0) {
    $('.arena-holding-child-container').each(function () {
      var libName = $(this).find('span.arena-holding-link').text()
      var totalAvailable = $(this).find('td.arena-holding-nof-total span.arena-value').text() || (parseInt($(this).find('td.arena-holding-nof-available-for-loan span.arena-value').text() || 0) + parseInt($(this).find('td.arena-holding-nof-checked-out span.arena-value').text() || 0))
      var checkedOut = $(this).find('td.arena-holding-nof-checked-out span.arena-value').text()
      if (libName) responseHoldings.availability.push({ library: libName, available: (parseInt(totalAvailable) - (checkedOut ? parseInt(checkedOut) : 0)), unavailable: (checkedOut !== '' ? parseInt(checkedOut) : 0) })
    })
    return common.endResponse(responseHoldings)
  }

  let currentOrg = null
  $('.arena-holding-hyper-container .arena-holding-container a span').each(function (i) { if ($(this).text().trim() === (service.OrganisationName || service.Name)) currentOrg = i })
  if (currentOrg == null) return common.endResponse(responseHoldings)

  var holdingsHeaders = { Accept: 'text/xml', 'Wicket-Ajax': true }
  holdingsHeaders['Wicket-FocusedElementId'] = 'id__crDetailWicket__WAR__arenaportlets____2a'
  var resourceId = '/crDetailWicket/?wicket:interface=:0:recordPanel:holdingsPanel:content:holdingsView:' + (currentOrg + 1) + ':holdingContainer:togglableLink::IBehaviorListener:0:'
  var holdingsUrl = service.Url + service.HoldingsDetailUrl.replace('[RESOURCEID]', resourceId)

  try {
    var holdingsResponse = await axios.get(holdingsUrl, { rejectUnauthorized: true, headers: holdingsHeaders, timeout: 20000, jar: true })
    var holdingsJs = await xml2js.parseStringPromise(holdingsResponse.data)
    $ = cheerio.load(holdingsJs['ajax-response'].component[0]._)
  } catch (e) {
    return common.endResponse(responseHoldings)
  }

  var libsData = $('.arena-holding-container')
  const numLibs = libsData.length
  if (!numLibs || numLibs === 0) return common.endResponse(responseHoldings)

  const availabilityRequests = []
  libsData.each(function (i) {
    resourceId = '/crDetailWicket/?wicket:interface=:0:recordPanel:holdingsPanel:content:holdingsView:' + (currentOrg + 1) + ':childContainer:childView:' + i + ':holdingPanel:holdingContainer:togglableLink::IBehaviorListener:0:'
    const liburl = service.Url + service.HoldingsLibraryUrl.replace('[RESOURCEID]', resourceId)
    var headers = { Accept: 'text/xml', 'Wicket-Ajax': true }
    availabilityRequests.push(axios.get(liburl, { rejectUnauthorized: true, headers: headers, timeout: 20000, jar: true }))
  })

  let responses = null
  try {
    responses = await axios.all(availabilityRequests)
  } catch (e) {
    return common.endResponse(responseHoldings)
  }

  responses.forEach(async (response) => {
    var availabilityJs = await xml2js.parseStringPromise(response.data)
    if (availabilityJs && availabilityJs['ajax-response']) {
      try {
        $ = cheerio.load(availabilityJs['ajax-response'].component[0]._)
        var totalAvailable = $('td.arena-holding-nof-total span.arena-value').text()
        var checkedOut = $('td.arena-holding-nof-checked-out span.arena-value').text()
        $ = cheerio.load(availabilityJs['ajax-response'].component[2]._)
        responseHoldings.availability.push({ library: $('span.arena-holding-link').text(), available: ((totalAvailable ? parseInt(totalAvailable) : 0) - (checkedOut ? parseInt(checkedOut) : 0)), unavailable: (checkedOut ? parseInt(checkedOut) : 0) })
      } catch (e) {
        return common.endResponse(responseHoldings)
      }
    }
  })

  return common.endResponse(responseHoldings)
}
