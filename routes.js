import express from 'express'

import * as catalogues from 'catalogues-library'
const router = express.Router()

/**
 * Gets library service data
 * @param {Object} req The request to parse
 * @param {Object} res The response to send
 */
router.get('/services', async (req, res) => {
  res.send(await catalogues.services(req.query.service))
})

/**
 * Gets individual library service point data
 * @param {Object} req The request to parse
 * @param {Object} res The response to send
 */
router.get('/libraries', async (req, res) => {
  res.send(await catalogues.libraries(req.query.service))
})

/**
 * Gets ISBN availability information for library service points
 * @param {Object} req The request to parse
 * @param {Object} res The response to send
 */
router.get('/availability/:isbn', async (req, res) => {
  res.send(await catalogues.availability(req.params.isbn, req.query.service))
})

/**
 * Gets results from the library thing thingISBN service
 * @param {Object} req The request to parse
 * @param {Object} res The response to send
 */
router.get('/thingISBN', async (req, res) =>
  res.send((await libThing.thingISBN(req.params.isbn)).isbns)
)

/**
 * Gets results from open libraries free text search
 * @param {Object} req The request to parse
 * @param {Object} res The response to send
 */
router.get('/openlibrary', async (req, res) =>
  res.send(await openLibrary.search(req.query.q))
)

/**
 * Runs through tests for the ISBN search
 * Restricted to non-production environments as it exposes internal
 * debugging functionality with no authentication.
 * @param {Object} req The request to parse
 * @param {Object} res The response to send
 */
router.get('/test', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).end()
  }
  res.send(await catalogues.testIsbnSearch())
})

export default router
