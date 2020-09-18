exports.getService = function (service) {
  return {
    name: service.Name,
    type: service.Type,
    url: service.Url,
    ssl: (service.Url.indexOf('https') !== -1)
  }
}

exports.isJsonString = function (str) {
  try {
    JSON.parse(str)
  } catch (e) {
    return false
  }
  return true
}
