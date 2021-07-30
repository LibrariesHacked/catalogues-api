const express = require('express')
const swaggerUi = require('swagger-ui-express')
const compression = require('compression')
const routes = require('./routes')
const app = express()
const openApiDocument = require('./openapi.json')
const port = process.env.PORT || 3000

app.use(compression())
app.use(express.static('public', { maxAge: '1d' }))

app.set('views', './views')
app.set('view engine', 'pug')

app.get('/', (req, res) => res.render('index'))
app.use('/api/', routes)

app.use(
  '/api/',
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument)
)

app.listen(port)
