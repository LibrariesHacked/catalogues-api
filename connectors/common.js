///////////////////////////////////////////
// COMMON FUNCTIONS
// Provides some common functionality into 
// a single file for the connectors to use
// such as error handling.
///////////////////////////////////////////

/////////////////////
// getService
// The majority of the get service call is just returning information that's in the service 
// object from data.json.  Maintain a list here of what to return.
exports.getService = function (service) {
    // BranchesTwitter is just an array of twitter account names - turn it into an array of objects.
    if (service.twitterBranches) {
        var twitterBranches = service.BranchesTwitter.map(function (account) {
            return {
                Account: account,
                AccountCreated: '',
                LastTweeted: '',
                LastTweet: '',
                NoOfTweets: 0,
                NoOfFollowers: 0,
                NoFollowing: 0,
                NoOfLikes: 0,
                AvatarImageUrl: '',
                BackgroundImageUrl: ''
            }
        });
    }

    return {
        Name: service.Name,
        Type: service.Type,
        CatalogueUrl: service.Url, // URL will be overriden if the sevice has its own implementation
        UsesHTTPS: (service.Url.indexOf('https') != -1 ? true : false),
        Twitter: {
            Account: service.Twitter,
            AccountCreated: '',
            LastTweeted: '',
            LastTweet: '',
            NoOfTweets: 0,
            NoOfFollowers: 0,
            NoFollowing: 0,
            NoOfLikes: 0,
            AvatarImageUrl: '',
            BackgroundImageUrl: ''
        },
        BranchesTwitter: (twitterBranches ? twitterBranches : [])
    };
};

/////////////////////
// handleErrors
// Used for error handling and checking HTTP status
// messages.
exports.handleErrors = function (callback, callbackObj, error, httpMessage) {
    if (httpMessage && (httpMessage.statusCode != 200 && httpMessage.statusCode != 302)) error = 'Web request error.  Status code was ' + httpMessage.statusCode;
    if (error) {
        console.log(callbackObj.service + ': ' + error);
        callbackObj.error = error;
        callbackObj.end = new Date();
        callback(callbackObj);
        return true;
    }
    return false;
};

/////////////////////
// isJsonString
exports.isJsonString = function (str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
};

/////////////////////
// completeCallback
// Just adds the current timestamp to a callback
exports.completeCallback = function (callback, callbackObj) {
    callbackObj.end = new Date();
    console.log(callbackObj);
    callback(callbackObj);
};