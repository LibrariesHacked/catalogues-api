const config = {
  services: 'https://api-geography.librarydata.uk/rest/libraryauthorities?fields[]=utla19cd&fields[]=utla19nm',
  availability: '/api/availabilityByISBN',
  postcodes: 'https://api-geography.librarydata.uk/rest/postcodes'
}

var btnSearch = document.getElementById('btnSearch')
var btnClear = document.getElementById('btnClear')
var spSearchSpinner = document.getElementById('spSearchSpinner')
var txtIsbn = document.getElementById('txtIsbn')
var txtPostcode = document.getElementById('txtPostcode')
var pFeedbackInfo = document.getElementById('pFeedbackInfo')
var pFound = document.getElementById('pFound')
var pAvailable = document.getElementById('pAvailable')
var pUnavailable = document.getElementById('pUnavailable')

let found = 0
let available = 0
let unavailable = 0
const libraries = []

const libraryTable = new simpleDatatables.DataTable('#tblResults', {
  labels: {
    noRows: 'Libraries will be listed when search is complete'
  },
  perPageSelect: false,
  columns: [
    {
      select: 2,
      hidden: true
    },
    {
      select: 3,
      hidden: true
    },
    {
      select: 4,
      render: function (data, cell, row) {
        const total = (parseInt(row.children[2].data) + parseInt(row.children[3].data))
        const copiesAvailable = parseInt(row.children[2].data) > 0
        const buttonIcon = copiesAvailable ? 'check' : 'times'
        row.classList.add(copiesAvailable ? 'table-success' : 'table-default')
        return `<p class="lead"><a href="${data}" target="_blank"><i class="fas fa-${buttonIcon}"></i> ${row.children[2].data}/${total}</a></p>`
      }
    }
  ]
})

btnSearch.addEventListener('click', async function () {
  const isbn = txtIsbn.value
  const postcode = txtPostcode.value
  await searchByIsbn(isbn, postcode)
})

btnClear.addEventListener('click', function () {
  clearData()
})

var clearData = () => {
  found = 0
  available = 0
  unavailable = 0
  pFeedbackInfo.innerText = ''
  btnSearch.removeAttribute('disabled')
  txtIsbn.value = ''
  pFound.innerText = '0'
  pAvailable.innerText = '0'
  pUnavailable.innerText = '0'
  libraries.length = 0
  libraryTable.rows().remove(Array.from({ length: libraryTable.data.length }, (v, k) => k))
  btnClear.setAttribute('disabled', 'disabled')
}

var searchByIsbn = async (isbn, postcode) => {

  pFeedbackInfo.innerText = ''

  let localSearch = false

  // Check whether it's a valid isbn
  if (!isValidIsbn(isbn)) {
    pFeedbackInfo.innerText = 'That doesn\'t seem to be an ISBN. Please try again.'
    return
  }

  let servicesUrl = config.services
  // Check whether it's a valid postcode
  if (postcode && postcode.length > 0) {
    if (isValidPostcode(postcode)) {
      pFeedbackInfo.innerText = 'Fetching postcode information'
      const postcodeResult = await self.fetch(`${config.postcodes}/${postcode}`)
      const postcodeData = await postcodeResult.json()
      servicesUrl = `${servicesUrl}&longitude=${postcodeData.longitude}&latitude=${postcodeData.latitude}`
      localSearch = true
    } else {
      pFeedbackInfo.innerText = 'That doesn\'t seem to be a postcode. Please try again.'
      return
    }
  }

  btnSearch.setAttribute('disabled', 'disabled')
  spSearchSpinner.style.visibility = 'visible'

  const servicesResult = await self.fetch(`${servicesUrl}`)
  const servicesData = await servicesResult.json()
  var requestUrls = servicesData.map(service => [service.utla19nm, `${config.availability}/${isbn}?service=${service.utla19cd}`])

  if (localSearch) {
    // Do the first five
    await performBatchSearch(requestUrls.splice(0, 5))
    while (available === 0 && requestUrls.length > 0) {
      await performBatchSearch(requestUrls.splice(0, 1))
    }
    addToLibraryTable()
  } else {
    await performBatchSearch(requestUrls)
    addToLibraryTable()
  }

  spSearchSpinner.style.visibility = 'hidden'
  btnClear.removeAttribute('disabled')
  libraryTable.columns().sort(2, 'desc')
  pFeedbackInfo.innerText = 'Search complete.'
}

var performBatchSearch = async (requestUrls) => {
  var chunked = chunkArray(requestUrls, 5)
  for (var x = 0; x < chunked.length; x++) {
    pFeedbackInfo.innerText = `Searching ${chunked[x].map(service => service[0]).join(', ')}`

    var promises = chunked[x].map(async url => {
      return self.fetch(url[1])
        .then(response => {
          response.json()
            .then(async availabilityResults => {
              if (availabilityResults && availabilityResults.length > 0 && availabilityResults[0].availability && availabilityResults[0].availability.length > 0) {
                availabilityResults[0].availability.forEach(library => {
                  found += (library.available + library.unavailable)
                  available += library.available
                  unavailable += library.unavailable
                  libraries.push([availabilityResults[0].service, library.library, String(library.available), String(library.unavailable), availabilityResults[0].url])
                })
                updateSummaryDisplay()
              }
            })
        })
    })
    await Promise.all(promises)
  }
}

var updateSummaryDisplay = () => {
  pFound.innerText = `${found} found`
  pAvailable.innerText = `${available} for loan`
  pUnavailable.innerText = `${unavailable} unavailable`
}

var addToLibraryTable = () => {
  libraries.forEach(library => {
    libraryTable.rows().add(library)
  })
  libraryTable.setColumns()
}

var isValidPostcode = (textInput) => {
  const postcodeRe = /^([A-Z][A-HJ-Y]?\d[A-Z\d]? ?\d[A-Z]{2}|GIR ?0A{2})$/
  const postcodeValid = postcodeRe.test(textInput)
  return postcodeValid
}

var isValidIsbn = (textInput) => {
  var sum
  var weight
  var digit
  var check
  var i

  textInput = textInput.replace(/[^0-9X]/gi, '')

  // Firstly it should be either 10 or 13 digits
  if (textInput.length !== 10 && textInput.length !== 13) return false

  if (textInput.length === 13) {
    sum = 0
    for (i = 0; i < 12; i++) {
      digit = parseInt(textInput[i])
      if (i % 2 === 1) {
        sum += 3 * digit
      } else {
        sum += digit
      }
    }
    check = (10 - (sum % 10)) % 10
    return (check.toString() === textInput[12])
  }

  if (textInput.length === 10) {
    weight = 10
    sum = 0
    for (i = 0; i < 9; i++) {
      digit = parseInt(textInput[i])
      sum += weight * digit
      weight--
    }
    check = (11 - (sum % 11)) % 11
    if (check === 10) {
      check = 'X'
    }
    return (check.toString() === textInput[9].toUpperCase())
  }
}

var chunkArray = (array, size) => {
  let result = []
  for (value of array) {
    let lastArray = result[result.length - 1]
    if (!lastArray || lastArray.length == size) {
      result.push([value])
    } else {
      lastArray.push(value)
    }
  }
  return result
}