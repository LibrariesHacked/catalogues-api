const config = {
  services:
    'https://api-geography.librarydata.uk/rest/libraryauthorities?fields[]=code&fields[]=name',
  availability: '/api/availability',
  postcodes: 'https://api-geography.librarydata.uk/rest/postcodes'
}

const queryString = window.location.search
const urlParams = new URLSearchParams(queryString)
const autoIsbn = urlParams.get('isbn')
const autoPostcode = urlParams.get('postcode')
const btnSearch = document.getElementById('btnSearch')
const btnClear = document.getElementById('btnClear')
const spSearchSpinner = document.getElementById('spSearchSpinner')
const txtIsbn = document.getElementById('txtIsbn')
const txtPostcode = document.getElementById('txtPostcode')
const pFeedbackInfo = document.getElementById('pFeedbackInfo')
const pFound = document.getElementById('pFound')
const pAvailable = document.getElementById('pAvailable')
const pUnavailable = document.getElementById('pUnavailable')

let found = 0
let available = 0
let unavailable = 0
const libraries = []

const libraryTable = new simpleDatatables.DataTable('#tblResults', {
  labels: {
    noRows: 'No current results to display'
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
      render: function (data, td, dataIndex, cellIndex) {
        const available = parseInt(libraryTable.data.data[dataIndex][2].data[0].data)
        const unavailable = parseInt(libraryTable.data.data[dataIndex][2].data[0].data)
        const total = available + unavailable
        const availableClass = available > 0 ? 'success' : 'warning'
        return `<p><a href="${data[0].data}" target="_blank"><span class="badge rounded-pill bg-${availableClass}">${available.toString()} of ${total.toString()} available</span></a></p>`
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

const clearData = () => {
  found = 0
  available = 0
  unavailable = 0
  pFeedbackInfo.innerText = ''
  btnSearch.removeAttribute('disabled')
  txtIsbn.value = ''
  pFound.innerText = '0'
  pAvailable.innerText = '0'
  pUnavailable.innerText = '0'
  libraryTable.rows.remove(
    Array.from({ length: libraries.length }, (v, k) => k)
  )
  libraries.length = 0
  btnClear.setAttribute('disabled', 'disabled')
}

const searchByIsbn = async (isbn, postcode) => {
  pFeedbackInfo.innerText = ''

  let localSearch = false

  // Check whether it's a valid isbn
  if (!isValidIsbn(isbn)) {
    pFeedbackInfo.innerText =
      "That doesn't seem to be a valid ISBN. Please try again."
    return
  }

  let servicesUrl = config.services
  // Check whether it's a valid postcode
  if (postcode && postcode.length > 0) {
    if (isValidPostcode(postcode.toUpperCase())) {
      pFeedbackInfo.innerText = 'Fetching postcode information'
      const postcodeResult = await self.fetch(`${config.postcodes}/${postcode}`)
      const postcodeData = await postcodeResult.json()
      servicesUrl = `${servicesUrl}&longitude=${postcodeData.longitude}&latitude=${postcodeData.latitude}`
      localSearch = true
    } else {
      pFeedbackInfo.innerText =
        "That doesn't seem to be a postcode. Please try again."
      return
    }
  }

  btnSearch.setAttribute('disabled', 'disabled')
  spSearchSpinner.style.visibility = 'visible'

  const servicesResult = await self.fetch(`${servicesUrl}`)
  const servicesData = await servicesResult.json()
  const requestUrls = servicesData.map(service => [
    service.name,
    `${config.availability}/${isbn}?service=${service.code}`
  ])

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
  libraryTable.columns.sort(2, 'desc')
  libraryTable.update()
  pFeedbackInfo.innerText = 'Search complete.'
}

const performBatchSearch = async requestUrls => {
  const chunked = chunkArray(requestUrls, 5)
  for (let x = 0; x < chunked.length; x++) {
    pFeedbackInfo.innerText = `Searching ${chunked[x]
      .map(service => service[0])
      .join(', ')}`

    const promises = chunked[x].map(async url => {
      return self.fetch(url[1]).then(response => {
        response.json().then(async availabilityResults => {
          if (
            availabilityResults &&
            availabilityResults.length > 0 &&
            availabilityResults[0].availability &&
            availabilityResults[0].availability.length > 0
          ) {
            availabilityResults[0].availability.forEach(library => {
              found += library.available + library.unavailable
              available += library.available
              unavailable += library.unavailable
              libraries.push([
                availabilityResults[0].service,
                library.library,
                String(library.available),
                String(library.unavailable),
                availabilityResults[0].url
              ])
            })
            updateSummaryDisplay()
          }
        })
      })
    })
    await Promise.all(promises)
  }
}

const updateSummaryDisplay = () => {
  pFound.innerText = `${found} found`
  pAvailable.innerText = `${available} for loan`
  pUnavailable.innerText = `${unavailable} unavailable`
}

const addToLibraryTable = () => {
  libraryTable.insert({ data: libraries })
}

const isValidPostcode = textInput => {
  const postcodeRe = /^([A-Z][A-HJ-Y]?\d[A-Z\d]? ?\d[A-Z]{2}|GIR ?0A{2})$/i
  const postcodeValid = postcodeRe.test(textInput)
  return postcodeValid
}

const isValidIsbn = textInput => {
  let sum
  let weight
  let digit
  let check
  let i

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
    return check.toString() === textInput[12]
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
    return check.toString() === textInput[9].toUpperCase()
  }
}

const chunkArray = (array, size) => {
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

const removeSpecialCharacters = textInput => {
  return textInput.replace(/[^a-zA-Z0-9 ]/g, '')
}

if (autoIsbn && isValidIsbn(autoIsbn))
  txtIsbn.value = removeSpecialCharacters(autoIsbn)
if (autoPostcode && isValidPostcode(autoPostcode))
  txtPostcode.value = removeSpecialCharacters(autoPostcode)
