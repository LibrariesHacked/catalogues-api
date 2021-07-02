
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

const LIBRARIES_URL_PORTLET = '?p_p_id=extendedSearch_WAR_arenaportlet&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=/extendedSearch/?wicket:interface=:0:extendedSearchPanel:extendedSearchForm:organisationHierarchyPanel:organisationContainer:organisationChoice::IBehaviorListener:0:&p_p_cacheability=cacheLevelPage&random=0.08709241788681465extended-search?p_p_id=extendedSearch_WAR_arenaportlet&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=/extendedSearch/?wicket:interface=:0:extendedSearchPanel:extendedSearchForm:organisationHierarchyPanel:organisationContainer:organisationChoice::IBehaviorListener:0:&p_p_cacheability=cacheLevelPage&random=0.08709241788681465'
const LIBRARIES_URL_PORTLETS = '?p_p_id=extendedSearch_WAR_arenaportlets&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=/extendedSearch/?wicket:interface=:0:extendedSearchPanel:extendedSearchForm:organisationHierarchyPanel:organisationContainer:organisationChoice::IBehaviorListener:0:&p_p_cacheability=cacheLevelPage&random=0.08709241788681465extended-search?p_p_id=extendedSearch_WAR_arenaportlet&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=/extendedSearch/?wicket:interface=:0:extendedSearchPanel:extendedSearchForm:organisationHierarchyPanel:organisationContainer:organisationChoice::IBehaviorListener:0:&p_p_cacheability=cacheLevelPage&random=0.08709241788681465'
const SEARCH_URL_PORTLET = 'search?p_p_id=searchResult_WAR_arenaportlet&p_p_lifecycle=1&p_p_state=normal&p_r_p_arena_urn:arena_facet_queries=&p_r_p_arena_urn:arena_search_type=solr&p_r_p_arena_urn:arena_search_query=[BOOKQUERY]'
const SEARCH_URL_PORTLETS = 'search?p_p_id=searchResult_WAR_arenaportlets&p_p_lifecycle=1&p_p_state=normal&p_p_mode=view&p_r_p_687834046_facet_queries=&p_r_p_687834046_search_type=solr&p_r_p_687834046_search_query=[BOOKQUERY]'
const ITEM_URL_PORTLET = 'results?p_p_id=crDetailWicket_WAR_arenaportlet&p_p_lifecycle=1&p_p_state=normal&p_r_p_arena_urn:arena_search_item_id=[ITEMID]&p_r_p_arena_urn:arena_facet_queries=&p_r_p_arena_urn:arena_agency_name=[ARENANAME]&p_r_p_arena_urn:arena_search_item_no=0&p_r_p_arena_urn:arena_search_type=solr'
const ITEM_URL_PORTLETS = 'results?p_p_id=crDetailWicket_WAR_arenaportlets&p_p_lifecycle=1&p_p_state=normal&p_p_mode=view&p_p_col_id=column-2&p_p_col_pos=2&p_p_col_count=4&p_r_p_687834046_facet_queries=&p_r_p_687834046_search_item_no=0&p_r_p_687834046_sort_advice=field%3DRelevance%26direction%3DDescending&p_r_p_687834046_search_type=solr&p_r_p_687834046_search_item_id=[ITEMID]&p_r_p_687834046_agency_name=[ARENANAME]'
const HOLDINGS_URL_PORTLET = 'results?p_p_id=crDetailWicket_WAR_arenaportlet&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=/crDetailWicket/?wicket:interface=:0:recordPanel:holdingsPanel::IBehaviorListener:0:&p_p_cacheability=cacheLevelPage&p_p_col_id=column-2&p_p_col_pos=1&p_p_col_count=3'
const HOLDINGS_URL_PORTLETS = 'results?p_p_id=crDetailWicket_WAR_arenaportlets&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=/crDetailWicket/?wicket:interface=:0:recordPanel:holdingsPanel::IBehaviorListener:0:&p_p_cacheability=cacheLevelPage&p_p_col_id=column-2&p_p_col_pos=1&p_p_col_count=3'
const HOLDINGSDETAIL_URL_PORTLET = 'results?p_p_id=crDetailWicket_WAR_arenaportlet&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=[RESOURCEID]&p_p_cacheability='
const HOLDINGSDETAIL_URL_PORTLETS = 'results?p_p_id=crDetailWicket_WAR_arenaportlets&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=[RESOURCEID]&p_p_cacheability='

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
  if (responseLibraries.libraries.length > 0) return common.endResponse(responseLibraries)

  // Get the advanced search page
  let advancedSearchResponse = null
  try {
    // The AdvancedUrl tends to either be advanced-search or extended-search
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
  const url = service.Url + service.AdvancedUrl + (service.portlets ? LIBRARIES_URL_PORTLETS : LIBRARIES_URL_PORTLET)
  let js = null
  try {
    const responseHeaderRequest = await axios.post(url, querystring.stringify({ 'organisationHierarchyPanel:organisationContainer:organisationChoice': service.OrganisationId }), { headers: headers })
    js = await xml2js.parseStringPromise(responseHeaderRequest.data)
  } catch (e) {
    common.endResponse(responseLibraries)
  }

  // Parse the results of the request
  if (js && js !== 'Undeployed' && js['ajax-response']?.component) {
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

  const searchUrl = (service.Portlets ? SEARCH_URL_PORTLETS : SEARCH_URL_PORTLET).replace('[BOOKQUERY]', bookQuery)
  responseHoldings.url = service.Url + searchUrl

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

  const itemDetailsUrl = (service.Portlets ? ITEM_URL_PORTLETS : ITEM_URL_PORTLET).replace('[ARENANAME]', service.ArenaName).replace('[ITEMID]', itemId)
  const itemUrl = service.Url + itemDetailsUrl

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
  const holdingsPanelHeader = { Accept: 'text/xml', 'Wicket-Ajax': true }
  const holdingsPanelUrl = service.Url + (service.Portlets ? HOLDINGS_URL_PORTLETS : HOLDINGS_URL_PORTLET)

  try {
    var holdingsPanelPortletResponse = await axios.get(holdingsPanelUrl, { rejectUnauthorized: true, headers: holdingsPanelHeader, timeout: 20000, jar: true })
    var js = await xml2js.parseStringPromise(holdingsPanelPortletResponse.data)
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
  var holdingsUrl = service.Url + (service.Portlets ? HOLDINGSDETAIL_URL_PORTLETS : HOLDINGSDETAIL_URL_PORTLET).replace('[RESOURCEID]', resourceId)

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
    const libUrl = service.Url + (service.Portlets ? HOLDINGSDETAIL_URL_PORTLETS : HOLDINGSDETAIL_URL_PORTLET).replace('[RESOURCEID]', resourceId)
    var headers = { Accept: 'text/xml', 'Wicket-Ajax': true }
    availabilityRequests.push(axios.get(libUrl, { rejectUnauthorized: true, headers: headers, timeout: 20000, jar: true }))
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
