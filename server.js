
const express = require('express')
const libraries = require('./libraries')

const app = express()

app.use(express.static('public'))

app.set('views', './views')
app.set('view engine', 'pug')

app.get('/', function (req, res) {
  res.render('index')
})

app.get('/services', libraries.getServices)
app.get('/servicegeo', libraries.getServiceGeo)
app.get('/libraries', libraries.getLibraries)

app.get('/availabilityByISBN/:isbn', libraries.isbnSearch)

app.get('/thingISBN/:isbn', libraries.thingISBN)
app.get('/openLibrarySearch', libraries.openLibrarySearch)

app.get('/testAvailabilityByISBN', libraries.testIsbnSearch)

const port = process.env.PORT || 3000
app.listen(port)
