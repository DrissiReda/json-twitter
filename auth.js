//local
/*
module.exports = {

    'facebookAuth' : {
        'clientID'      : '138977073599145',
        'clientSecret'  : '33bcfd1cf9a6c2d3cf8d23621f1ce503',
        'callbackURL'   : 'http://localhost:5000/auth/facebook/callback'
    },

    'twitterAuth' : {
        'consumerKey'       : 'R0vLirK6p1uKMyLjMztihVrcS',
        'consumerSecret'    : '8ekinKd7rGUckBaQYAsPgAhx0Tp4NavpCjfblushP8tOJt0DyZ',
        'callbackURL'       : 'http://localhost:5000/auth/twitter/callback'
    },

    'googleAuth' : {
        'clientID'      : '240484377647-e5c5vf0lb77b3qijvcd5nfb18vd9ntr3.apps.googleusercontent.com',
        'clientSecret'  : 'tvSDR6og9aSf_GHhtkt0GJmV',
        'callbackURL'       : 'http://localhost:5000/auth/google/callback'
    }

};
*/
//heroku

module.exports = {

    'facebookAuth' : {
        'clientID'      : '138977073599145',
        'clientSecret'  : '33bcfd1cf9a6c2d3cf8d23621f1ce503',
        'callbackURL'   : 'https://aws-twitter.herokuapp.com/auth/facebook/callback'
    },

    'twitterAuth' : {
        'consumerKey'       : 'fctmgbWkgNhm8bI6neb4JAb4S',
        'consumerSecret'    : '0WoLeNFZqP47aQ3qajNJ53OiKFNhf8CnduM39znqVGg38bSRtP',
        'callbackURL'       : 'https://aws-twitter.herokuapp.com/auth/twitter/callback'
    },

    'googleAuth' : {
        'clientID'    : '240484377647-f78jqsrbht72oap48srjfllcgs1hj3bi.apps.googleusercontent.com',
        'clientSecret' : '1BKGvh0lt3dKXOCOy2t9DksC',
        'callbackURL'   : 'https://aws-twitter.herokuapp.com/auth/google/callback'
    }

};
