var AWSSQS= require('aws-sdk');
AWSSQS.config = new AWSSQS.Config();

//jmes path query expressions
// use jms.search(inputdata, expression);
//useful for making nice readable output from aws sdk
var jms = require('jmespath');

//config
var config = require('config-json');
config.load('./conf/conf.json');

var ep = new AWS.Endpoint(config.get("sqs", "endpoint"));
var sqs = new AWS.SQS({endpoint: ep, region: config.get("sqs", "region")});
var Queues={jobsq: config.get("sqs", "jobsq"), notifyq: "notify_all"};

/**
 * returns result of an SQS command
 * @param {array} event 
 * @returns Promise<any>
 */
function sqsMessage(event){
    AWSSQS.config = new AWSSQS.Config();
    var client=new AWSSQS.SQS({region:event.region});
    var params=event.params;

    return new Promise(function(resolve, reject){
        /**
        client [task] function is a generic AWS client task handler
        */
        client[event.task](params, function(err, data) {
            console.log("Starting callback of client task "+event.task);
            if (err) {
                console.log("Inside SQS Error"+JSON.stringify(err));
                callback(err, null);
            }else{
                if (data.length!==0) {
                    //var output=jms.search(data, "Vpcs[].{ID: VpcId, IPRange: CidrBlock, Tags: Tags[*]}");
                    callback(null, data);
                }else{
                    callback(null, "");
                }
            }
        });
    })
}

async function getMessage(message){
    var event={
        region: (message.region !==null ? message.region : s3region),
        task: "getObject",
        params: {
            QueueUrl: qURL, /* required */
            MaxNumberOfMessages: 1,
            VisibilityTimeout: 0,
            WaitTimeSeconds: 0
        }
    };

    try{
        const message=sqsMessage(event);
        return JSON.parse(message);
    }catch(e){
        throw e;
    } 
}

module.exports=getMessage;
module.exports.set=setMessage;