var async = require('async');
var data = require('./data');
var axiell = require('./typeAxiell');
var civica = require('./typeCivica');
var capita = require('./typeCapita');
var solus = require('./typeSolus');
var sirsiDynix = require('./typeSirsiDynix');
var biblioCommons = require('./typeBiblioCommons');
var serviceFunctions = { axiell: axiell, civica: civica, capita: capita, solus: solus, sirsiDynix: sirsiDynix, biblioCommons: biblioCommons };

///
exports.getAllLibraries = function(req, res) {
	res.send(data.LibraryServices);
};

///
exports.searchISBNAllServices = function(req, res) {
	var libraryISBNSearchFunctions = data.LibraryServices.map(function (libraryService) {
		return function(callback){
			serviceFunctions[libraryService.Type].searchByISBN(req.params.isbn, libraryService, function(response) {
				callback(null, response);
			});
		}
    });

	async.parallel(libraryISBNSearchFunctions, function (err, response) {
		res.send(response);
	});	
};

///
exports.searchISBNByService = function(req, res) {

    var foundLibrary = false;
	for(var i = 0; i < data.LibraryServices.length; i++) {
	    if (data.LibraryServices[i].Name.toLowerCase() == req.params.service.toLowerCase()) {
		    foundLibrary = true;
		    serviceFunctions[data.LibraryServices[i].Type].searchByISBN(req.params.isbn, data.LibraryServices[i], function (response) {
				res.send(response);
			});
		}
	}
	if (!foundLibrary) res.send({ "Error": "Library service not found" });

};