const axios = require('axios')

console.log('open library connector loading...')

const URL = 'http://openlibrary.org/search.json?q='

exports.search = async (query) => {
  const responseData = { books: [] }
  const searchRequest = await axios.get(URL + query, { timeout: 1000 })

  searchRequest.data.docs.forEach((b, a) => { responseData.books.push({ title: b.title, author: b.author_name, isbn: b.isbn }) })
  return responseData
}
