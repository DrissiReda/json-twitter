module.exports = {

    'facebookAuth' : {
        'clientID'      : 'your-secret-clientID-here', // your App ID
        'clientSecret'  : 'your-client-secret-here', // your App Secret
        'callbackURL'   : 'http://localhost:8080/auth/facebook/callback'
    },

    'twitterAuth' : {
        'consumerKey'       : 'your-consumer-key-here',
        'consumerSecret'    : 'your-client-secret-here',
        'callbackURL'       : 'http://localhost:8080/auth/twitter/callback'
    },

    'googleAuth' : {

        //localhost
        // 'clientID'      : '240484377647-e5c5vf0lb77b3qijvcd5nfb18vd9ntr3.apps.googleusercontent.com',
        // 'clientSecret'  : 'e4eHS4YJ5tJ8oFAAluq-qNuR',
        //heroku
          'clientID'    : '240484377647-f78jqsrbht72oap48srjfllcgs1hj3bi.apps.googleusercontent.com',
          'clientSecret' : '1BKGvh0lt3dKXOCOy2t9DksC',
          'callbackURL'   : 'http://aws-twitter.herokuapp.com/auth/google/callback'
        /* heroku
        240484377647-f78jqsrbht72oap48srjfllcgs1hj3bi.apps.googleusercontent.com
        1BKGvh0lt3dKXOCOy2t9DksC
        */
    }

};
