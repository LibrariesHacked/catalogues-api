var services = []

// First thing we do is fetch a list of services
fetch(config.services)
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

var clearData = function () {

}

var searchByIsbn = (isbn) => {
  if (!isValidIsbn(isbn)) return null

  var requestUrls = services.map(service => `/api/availabilityByIsbn/${isbn}&service=${service.name}`)

  Promise.all(
    requestUrls.map(url => {
      return fetch(url)
        .then(value => {
          value.json()
        })
    })
  )
    .then((value) => {
      console.log(value)
      //json response
    })
    .catch((err) => {
      console.log(err);
    });

}

var isValidIsbn = function (textInput) {
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
