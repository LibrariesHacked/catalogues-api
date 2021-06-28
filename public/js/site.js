var config = {
  services: '/api/services',
  availability: '/api/availabilityByISBN'
}
var services = []
var found = 0
var available = 0
var unavailable = 0
var libraries = []

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
        var total = (parseInt(row.children[2].data) + parseInt(row.children[3].data))
        var copiesAvailable = parseInt(row.children[2].data) > 0
        var buttonClass = copiesAvailable > 0 ? 'light' : 'warning'
        var buttonIcon = copiesAvailable ? 'check' : 'times'
        row.classList.add(copiesAvailable ? 'table-success' : 'table-default')
        return `<a class="btn btn-lg btn-${buttonClass}" href="${data}" target="_blank"><i class="fas fa-${buttonIcon}"></i> ${row.children[2].data}/${total}</a>`
      }
    }
  ]
})

window.fetch(config.services)
  .then(response => {
    response.json()
      .then(serviceResults => {
        services = serviceResults
        document.getElementById('btnSearch').removeAttribute('disabled')
      })
  })
  .catch((error) => console.log(error))

document.getElementById('btnSearch').addEventListener('click', function () {
  var isbn = document.getElementById('txtIsbn').value
  clearData()
  searchByIsbn(isbn)
})

document.getElementById('btnClear').addEventListener('click', function () {
  clearData()
})

var clearData = () => {
  document.getElementById('btnSearch').removeAttribute('disabled')
}

var searchByIsbn = (isbn) => {
  if (!isValidIsbn(isbn)) return null

  document.getElementById('btnSearch').setAttribute('disabled', 'disabled')

  var requestUrls = services.map(service => `${config.availability}/${isbn}?service=${service.name}`)

  Promise.all(
    requestUrls.map(url => {
      return window.fetch(url)
        .then(response => {
          response.json()
            .then(availabilityResults => {
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
  )
    .then((value) => {
      addToLibraryTable()
    })
    .catch((err) => {
      console.log(err)
    })
}

var updateSummaryDisplay = () => {
  document.getElementById('pFound').innerText = `${found} found`
  document.getElementById('pAvailable').innerText = `${available} available`
  document.getElementById('pUnavailable').innerText = `${unavailable} unavailable`
}

var addToLibraryTable = () => {
  libraries.forEach(library => {
    libraryTable.rows().add(library)
  })
  libraryTable.setColumns()
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
