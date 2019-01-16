
/*
Helper functions for API Gateway response and request handling through to Lambda.
 */
function setResponse(data) {
    //code
    return response = {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin" : "*",
          "Some-Random-Ben-Header" : "OKDOKE"
         // "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS
        },
        body: JSON.stringify(data)
    };

}

//returns a request event object that has been parsed from JSON.parse
function getRequest(event) {
    //code
    return request = {
        headers: event.headers,
        body: JSON.parse(event.body)
    };
}


module.exports=getRequest;
module.exports.req=getRequest;
module.exports.res=setResponse;