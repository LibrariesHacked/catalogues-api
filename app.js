const express = require('express')
const compression = require('compression')
const libraries = require('./libraries')

const app = express()

app.use(compression())
app.use(express.static('public', { maxAge: '1d' }))

app.set('views', './views')
app.set('view engine', 'pug')

app.get('/', (req, res) => res.render('index'))

app.get('/api/services', libraries.getServices)
app.get('/api/libraries', libraries.getLibraries)

app.get('/api/availabilityByISBN/:isbn', libraries.isbnSearch)

app.get('/api/thingISBN/:isbn', libraries.thingISBN)
app.get('/api/openLibrarySearch', libraries.openLibrarySearch)

app.get('/api/testAvailabilityByISBN', libraries.testIsbnSearch)

const port = process.env.PORT || 3000
app.listen(port)
