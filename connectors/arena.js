
const request = require('request')
const xml2js = require('xml2js')
const cheerio = require('cheerio')
const forever = require('forever-agent')

const common = require('../connectors/common')

const ITEM_URL = 'results?p_auth=cnJs8BK0&p_p_id=crDetailWicket_WAR_arenaportlets&p_p_lifecycle=1&p_p_state=normal&p_p_mode=view&p_p_col_id=column-2&p_p_col_pos=2&p_p_col_count=4&p_r_p_687834046_facet_queries=&p_r_p_687834046_search_item_no=0&p_r_p_687834046_sort_advice=field%3DRelevance%26direction%3DDescending&p_r_p_687834046_search_type=solr&p_r_p_687834046_search_item_id=[ITEMID]&p_r_p_687834046_agency_name=[ARENANAME]'
const SEARCH_URL = 'search?p_auth=NJXnzkEv&p_p_id=searchResult_WAR_arenaportlets&p_p_lifecycle=1&p_p_state=normal&p_p_mode=view&p_r_p_687834046_facet_queries=&p_r_p_687834046_sort_advice=field%3DRelevance%26direction%3DDescending&p_r_p_687834046_search_type=solr&p_r_p_687834046_search_query=[BOOKQUERY]'
const AVAILABILITY_CONTAINER = '/crDetailWicket/?wicket:interface=:0:recordPanel:holdingsPanel::IBehaviorListener:0:'

exports.getService = function (svc) {
  var service = common.getService(svc)
  return service
}

exports.getLibraries = async function (service) {
  var agent = forever.ForeverAgent
  var responseLibraries = { service: service.Name, code: service.Code, libraries: [], start: new Date() }

  if (service.Libraries) {
    for (var lib in service.Libraries) responseLibraries.libraries.push(lib)
    responseLibraries.end = new Date()
    return responseLibraries
  }

  var advancedSearch = { url: service.Url + service.Advanced, timeout: 30000, jar: true, agent: agent, rejectUnauthorized: (!service.IgnoreSSL) }
  var advancedSearchResponse = await request.get(advancedSearch)

  var $ = cheerio.load(advancedSearchResponse)

  var headers = { Accept: 'text/xml', 'Wicket-Ajax': true, 'Wicket-FocusedElementId': 'id__extendedSearch__WAR__arenaportlets____d' }
  if ($('.arena-extended-search-branch-choice option').length > 1) {
    $('.arena-extended-search-branch-choice option').each(function () {
      if ($(this).text() !== 'Select library') responseLibraries.libraries.push($(this).text())
    })
    return responseLibraries
  }

  var headersRequest = { rejectUnauthorized: (!service.IgnoreSSL), jar: true, agent: agent, timeout: 30000, headers: headers, form: { 'organisationHierarchyPanel:organisationContainer:organisationChoice': service.OrganisationId }, url: service.Url + service.Advanced + '?p_p_id=extendedSearch_WAR_arenaportlets&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=/extendedSearch/?wicket:interface=:0:extendedSearchPanel:extendedSearchForm:organisationHierarchyPanel:organisationContainer:organisationChoice::IBehaviorListener:0:&p_p_cacheability=cacheLevelPage&p_p_col_id=column-2&p_p_col_count=1&random=0.1554477137741876' }

  var responseHeaderRequest = await request.post(headersRequest)

  var js = await xml2js.parseStringPromise(responseHeaderRequest)

  if (js && js['ajax-response'] && js['ajax-response'].component) {
    $ = cheerio.load(js['ajax-response'].component[0]._)
    $('option').each(function () {
      if ($(this).text() !== 'Select library') responseLibraries.libraries.push($(this).text())
    })
  }
  return responseLibraries
}

exports.searchByISBN = async function (isbn, lib) {
  var responseHoldings = { service: lib.Name, code: lib.Code, availability: [], start: new Date() }
  var agent = forever.ForeverAgent
  var numLibs = 0
  var currentOrg = null

  var bookQuery = (lib.SearchType !== 'Keyword' ? lib.ISBNAlias + '_index:' + isbn : isbn)
  if (lib.OrganisationId) bookQuery = 'organisationId_index:' + lib.OrganisationId + '+AND+' + bookQuery
  responseHoldings.url = lib.Url + SEARCH_URL.replace('[BOOKQUERY]', bookQuery)

  var searchResponse = await request.get({ url: responseHoldings.url, timeout: 20000, jar: true, agent: agent, rejectUnauthorized: !lib.IgnoreSSL })

  if (searchResponse.lastIndexOf('search_item_id=') === -1) return responseHoldings
  var itemId = searchResponse.substring(searchResponse.lastIndexOf('search_item_id=') + 15)
  var url = lib.Url + ITEM_URL.replace('[ARENANAME]', lib.ArenaName).replace('[ITEMID]', itemId.substring(0, itemId.indexOf('&')))

  var itemPageResponse = await request.get({ agent: agent, rejectUnauthorized: !lib.IgnoreSSL, url: url, timeout: 20000, headers: { Connection: 'keep-alive' }, jar: true })

  var $ = cheerio.load(itemPageResponse)
  if ($('.arena-availability-viewbranch').length > 0) {
    $('.arena-availability-viewbranch').each(function () {
      var libName = $(this).find('.arena-branch-name span').text()
      var totalAvailable = $(this).find('.arena-availability-info span').eq(0).text().replace('Total ', '')
      var checkedOut = $(this).find('.arena-availability-info span').eq(1).text().replace('On loan ', '')
      if (libName) responseHoldings.availability.push({ library: libName, available: ((totalAvailable ? parseInt(totalAvailable) : 0) - (checkedOut ? parseInt(checkedOut) : 0)), unavailable: (checkedOut !== '' ? parseInt(checkedOut) : 0) })
    })
    return responseHoldings
  }

  var headers = { Accept: 'text/xml', 'Wicket-Ajax': true }
  var containerUrl = lib.Url + 'results?p_p_id=crDetailWicket_WAR_arenaportlets&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=' + AVAILABILITY_CONTAINER + '&p_p_cacheability=cacheLevelPage&p_p_col_id=column-2&p_p_col_pos=1&p_p_col_count=3'

  var containerResponse = await request.get({ agent: agent, rejectUnauthorized: !lib.IgnoreSSL, url: containerUrl, headers: headers, timeout: 20000, jar: true })

  var js = await xml2js.parseStringPromise(containerResponse)

  if (!js['ajax-response'].component) return responseHoldings
  $ = cheerio.load(js['ajax-response'].component[0]._)

  if ($('.arena-holding-nof-total, .arena-holding-nof-checked-out, .arena-holding-nof-available-for-loan').length > 0) {
    $('.arena-holding-child-container').each(function () {
      var libName = $(this).find('span.arena-holding-link').text()
      var totalAvailable = $(this).find('td.arena-holding-nof-total span.arena-value').text() || (parseInt($(this).find('td.arena-holding-nof-available-for-loan span.arena-value').text() || 0) + parseInt($(this).find('td.arena-holding-nof-checked-out span.arena-value').text() || 0))
      var checkedOut = $(this).find('td.arena-holding-nof-checked-out span.arena-value').text()
      if (libName) responseHoldings.availability.push({ library: libName, available: (parseInt(totalAvailable) - (checkedOut ? parseInt(checkedOut) : 0)), unavailable: (checkedOut !== '' ? parseInt(checkedOut) : 0) })
    })
    return responseHoldings
  }

  $('.arena-holding-hyper-container .arena-holding-container a span').each(function (i) { if ($(this).text().trim() === (lib.OrganisationName || lib.Name)) currentOrg = i })

  if (currentOrg == null) return responseHoldings

  var holdingsHeaders = { Accept: 'text/xml', 'Wicket-Ajax': true }
  holdingsHeaders['Wicket-FocusedElementId'] = 'id__crDetailWicket__WAR__arenaportlets____2a'
  var resourceId = '/crDetailWicket/?wicket:interface=:0:recordPanel:holdingsPanel:content:holdingsView:' + (currentOrg + 1) + ':holdingContainer:togglableLink::IBehaviorListener:0:'
  var holdingsUrl = lib.Url + 'results?p_p_id=crDetailWicket_WAR_arenaportlets&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=' + resourceId + '&p_p_cacheability='
  var holdingsResponse = await request.get({ agent: agent, rejectUnauthorized: !lib.IgnoreSSL, headers: headers, url: holdingsUrl, timeout: 20000, jar: true })

  var holdingsJs = await xml2js.parseStringPromise(holdingsResponse)

  $ = cheerio.load(holdingsJs['ajax-response'].component[0]._)
  var libsData = $('.arena-holding-container')
  numLibs = libsData.length
  if (!numLibs || numLibs === 0) return responseHoldings

  libsData.each(async function (i) {
    resourceId = '/crDetailWicket/?wicket:interface=:0:recordPanel:holdingsPanel:content:holdingsView:' + (currentOrg + 1) + ':childContainer:childView:' + i + ':holdingPanel:holdingContainer:togglableLink::IBehaviorListener:0:'
    url = lib.Url + 'results?p_p_id=crDetailWicket_WAR_arenaportlets&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=' + resourceId + '&p_p_cacheability='

    var headers = { Accept: 'text/xml', 'Wicket-Ajax': true }
    var libraryAvailabilityResponse = await request.get({ agent: agent, rejectUnauthorized: !lib.IgnoreSSL, headers: headers, url: url, timeout: 20000, jar: true })
    var availabilityJs = await xml2js.parseStringPromise(libraryAvailabilityResponse)
    if (availabilityJs && availabilityJs['ajax-response']) {
      $ = cheerio.load(availabilityJs['ajax-response'].component[0]._)
      var totalAvailable = $('td.arena-holding-nof-total span.arena-value').text()
      var checkedOut = $('td.arena-holding-nof-checked-out span.arena-value').text()
      $ = cheerio.load(availabilityJs['ajax-response'].component[2]._)
      responseHoldings.availability.push({ library: $('span.arena-holding-link').text(), available: ((totalAvailable ? parseInt(totalAvailable) : 0) - (checkedOut ? parseInt(checkedOut) : 0)), unavailable: (checkedOut ? parseInt(checkedOut) : 0) })
    }
  })
  return responseHoldings
}
