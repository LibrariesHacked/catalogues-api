document.getElementById('btnSearch').addEventListener('click', function () {
  clearData()
  searchByIsbn()
})

document.getElementById('btnClear').addEventListener('click', function () {
  clearData()
})

var clearData = function () {

}

var searchByIsbn = function (isbn) {
  if (!isValidIsbn(isbn)) return null
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
    return (check === textInput[12])
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
    return (check === textInput[9].toUpperCase())
  }
}
