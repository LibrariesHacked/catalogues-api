const express = require('express')
const compression = require('compression')

const swaggerUi = require('swagger-ui-express')
const openApiDocument = require('./openapi.json')

const routes = require('./routes')
const app = express()

const port = process.env.PORT || 3000

app.use(compression())
app.use(express.static('public', { maxAge: '1d' }))

app.set('views', './views')
app.set('view engine', 'pug')

app.get('/', (req, res) => res.render('index'))
app.get('/about', (req, res) => res.render('about'))
app.get('/accessibility', (req, res) => res.render('accessibility'))
app.get('/privacy', (req, res) => res.render('privacy'))

app.use('/api/', routes)
app.use('/api/', swaggerUi.serve, swaggerUi.setup(openApiDocument))

app.listen(port)
