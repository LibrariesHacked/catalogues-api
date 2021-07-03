const xml2js = require('xml2js')
const common = require('../connectors/common')

const axios = require('axios').default
const axiosCookieJarSupport = require('axios-cookiejar-support').default
const tough = require('tough-cookie')
axiosCookieJarSupport(axios)
const cookieJar = new tough.CookieJar()
axios.defaults.jar = cookieJar
axios.defaults.withCredentials = true

console.log('iguana connector loading...')

const ITEM_SEARCH = 'fu=BibSearch&RequestType=ResultSet_DisplayList&NumberToRetrieve=10&StartValue=1&SearchTechnique=Find&Language=eng&Profile=Iguana&ExportByTemplate=Brief&TemplateId=Iguana_Brief&FacetedSearch=Yes&MetaBorrower=&Cluster=0&Namespace=0&BestMatch=99&ASRProfile=&Sort=Relevancy&SortDirection=1&WithoutRestrictions=Yes&Associations=Also&Application=Bib&Database=[DB]&Index=Keywords&Request=[ISBN]&SessionCMS=&CspSessionId=[SID]&SearchMode=simple&SIDTKN=[SID]'
const FACET_SEARCH = 'FacetedSearch=[RESULTID]&FacetsFound=&fu=BibSearch&SIDTKN=[SID]'
const HEADER = { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' }
const HOME = 'www.main.cls'

/**
 * Gets the object representing the service
 * @param {object} service
 */
exports.getService = (service) => {
  const serviceData = common.getService(service)
  serviceData.url = service.Url + HOME
  return serviceData
}

/**
 * Gets the libraries in the service based upon possible search and filters within the library catalogue
 * @param {object} service
 */
exports.getLibraries = async function (service) {
  const responseLibraries = common.initialiseGetLibrariesResponse(service)

  let sid = null
  try {
    const homePageRequest = await axios.get(service.Url + HOME)
    const sessionCookie = homePageRequest.headers['set-cookie'][0]
    sid = sessionCookie.substring(43, 53)
  } catch (e) {
    return common.endResponse(responseLibraries)
  }

  const body = ITEM_SEARCH.replace('[ISBN]', 'harry').replace('Index=Isbn', 'Index=Keywords').replace('[DB]', service.Database).replace('[TID]', 'Iguana_Brief').replace(/\[SID\]/g, sid)

  const searchUrl = service.Url + 'Proxy.SearchRequest.cls'
  const searchPageRequest = await axios.post(searchUrl, body, { headers: { ...HEADER, Referer: service.Url + HOME }, timeout: 30000 })
  const searchJs = await xml2js.parseStringPromise(searchPageRequest.data)

  if (service.Faceted) {
    const resultId = searchJs.searchRetrieveResponse.resultSetId[0]

    let facets = null
    try {
      const facetRequest = await axios.post(service.Url + 'Proxy.SearchRequest.cls', FACET_SEARCH.replace('[RESULTID]', resultId).replace(/\[SID\]/g, sid), { jar: true, headers: { ...HEADER, Referer: service.Url + HOME }, timeout: 30000 })
      const facetJs = await xml2js.parseStringPromise(facetRequest.data)
      facets = facetJs.VubisFacetedSearchResponse.Facets[0].Facet
    } catch (e) {
      return common.endResponse(responseLibraries)
    }

    if (facets) {
      facets.forEach((facet) => {
        if (facet.FacetWording[0] === service.LibraryFacet) {
          facet.FacetEntry.forEach((location) => responseLibraries.libraries.push(location.Display[0]))
        }
      })
    }
  } else {
    if (searchJs && searchJs.searchRetrieveResponse && searchJs.searchRetrieveResponse.records) {
      searchJs.searchRetrieveResponse.records[0].record.forEach(function (record) {
        const recData = record.recordData
        if (recData && recData[0] && recData[0].BibDocument && recData[0].BibDocument[0] && recData[0].BibDocument[0].HoldingsSummary && recData[0].BibDocument[0].HoldingsSummary[0]) {
          recData[0].BibDocument[0].HoldingsSummary[0].ShelfmarkData.forEach((item) => {
            var lib = item.Shelfmark[0].split(' : ')[0]
            if (responseLibraries.libraries.indexOf(lib) === -1) responseLibraries.libraries.push(lib)
          })
        }
      })
    }
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

  let searchJs = null
  try {
    const homePageRequest = await axios.get(service.Url + HOME)
    const sessionCookie = homePageRequest.headers['set-cookie'][0]
    const iguanaCookieIndex = sessionCookie.indexOf('iguana-=')
    const sid = sessionCookie.substring(iguanaCookieIndex + 20, iguanaCookieIndex + 30)
    const searchPageRequest = await axios.post(service.Url + 'Proxy.SearchRequest.cls', ITEM_SEARCH.replace('[ISBN]', isbn).replace('[DB]', service.Database).replace('[TID]', 'Iguana_Brief').replace(/\[SID\]/g, sid), { headers: { ...HEADER, Referer: service.Url + HOME }, timeout: 60000 })
    searchJs = await xml2js.parseStringPromise(searchPageRequest.data)
  } catch (e) {
    return common.endResponse(responseHoldings)
  }

  let record = null
  if (searchJs?.searchRetrieveResponse && !searchJs.searchRetrieveResponse.bestMatch && searchJs.searchRetrieveResponse.records && searchJs.searchRetrieveResponse.records[0].record) record = searchJs.searchRetrieveResponse.records[0]?.record[0]

  if (record?.recordData && record.recordData[0] && record.recordData[0].BibDocument[0] && record.recordData[0].BibDocument[0].HoldingsSummary) {
    record.recordData[0].BibDocument[0].HoldingsSummary[0].ShelfmarkData.forEach(function (item) {
      if (item.Shelfmark) {
        var lib = item.Shelfmark[0].split(' : ')[0]
        responseHoldings.availability.push({ library: lib, available: item.Available ? parseInt(item.Available[0]) : 0, unavailable: item.Available === '0' ? 1 : 0 })
      }
    })
  }

  return common.endResponse(responseHoldings)
}
