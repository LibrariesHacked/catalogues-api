import express from 'express'
const router = express.Router()

import * as catalogues from 'catalogues-library'

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
 * @param {Object} req The request to parse
 * @param {Object} res The response to send
 */
router.get('/test', async (req, res) => {
  res.send(await catalogues.testIsbnSearch())
})

export default router
