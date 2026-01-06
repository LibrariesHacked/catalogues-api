import express from 'express'
import compression from 'compression'
import swaggerUi from 'swagger-ui-express'
import { readFileSync } from 'fs'
import routes from './routes.js'

const openApiDocument = JSON.parse(readFileSync('./openapi.json', 'utf-8'))
const app = express()

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

app.listen(process.env.PORT || 3000)
