///////////////////////////////////////////
// COMMON FUNCTIONS
// Provides some common functionality into 
// a single file for the connectors to use
// such as error handling.
///////////////////////////////////////////

/////////////////////
// handleErrors
// Used for error handling and checking HTTP status
// messages.
exports.handleErrors = function (callback, callbackObj, error, httpMessage) {
    if (httpMessage && httpMessage.statusCode != 200) error = 'Web request error.  Status code was ' + httpMessage.statusCode;
    if (error) {
        console.log(callbackObj.service + ': ' + error);
        callbackObj.error = error;
        callbackObj.end = new Date();
        callback(callbackObj);
        return true;
    }
    return false;
};

exports.completeCallback = function (callback, callbackObj) {
    callbackObj.end = new Date();
    callback(callbackObj);
};