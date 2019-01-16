var AWSS3= require('aws-sdk');
AWSS3.config = new AWSS3.Config();

//jmes path query expressions
// use jms.search(inputdata, expression);
//useful for making nice readable output from aws sdk
var jms = require('jmespath');

//config
var config = require('config-json');
config.load('./conf/conf.json');
config.load('./conf/output.json');
var Buckets={meta: config.get("TopsMetaBucketName"), main: "teemops"};
var q_bucket=config.get("s3", "q_bucket");
var s3q=config.get("s3q", "ec2");
var s3region=config.get("s3", "region");
var metaRegion=config.get("s3meta", "region");

function s3qMessage(event, callback) {
    AWSS3.config = new AWSS3.Config();
    var s3Client=new AWSS3.S3({region:event.region});
    var params=event.params;
    
    /**
    s3Client [task] function is a generic S3 task handler
    */
    s3Client[event.task](params, function(err, data) {
        console.log("Starting callback of s3Client task "+event.task);
        if (err) {
            console.log("Inside S3Q Error"+JSON.stringify(err));
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
}

/**

Gets message from message queue.
expecting following format:
{
    "s3SchemaVersion": "1.0",
    "configurationId": "7b9919de-46fd-4247-bd2d-a931c7db0e0a",
    "bucket": {
        "name": "s3qteemopsdev",
        "ownerIdentity": {
            "principalId": "A10I6RC19ZUXOH"
        },
        "arn": "arn:aws:s3:::s3qteemopsdev"
    },
    "object": {
        "key": "ec2/37983826-7eae-47ce-b918-46434ad6af4c",
        "size": 455,
        "eTag": "02329889f3db816b93405b16eb5fb59e",
        "versionId": "fZzVaNf0zXQBwjTzQHfxQ.tOMl1Q_2Cp",
        "sequencer": "0058F96B6CA229F734"
    }
}
*/
function getMessage(message, callback){
    var event={
        region: (message.region !==null ? message.region : s3region),
        task: "getObject",
        params: {
            Bucket: message.bucket.name,
            Key: message.object.key
        }
    };
    s3qMessage(event, function(err, data){
        if(err){
            callback(err, null);
        }else{
            var msg=JSON.parse(data.Body);
            callback(null, data);
        }
        
    }); 

}

/**

Sets message in a bucket
expecting following format:
{
    "bucket": {
        "name": "teemops-meta"
    },
    "object": {
        "key": "ec2/37983826-7eae-47ce-b918-46434ad6af4c",
        "body": "{somekey:somevalue}""
    }
}
*/
function setMessage(message, callback){
    var event={
        region: (message.region !==null ? message.region : s3region),
        task: "putObject",
        params: {
            Bucket: message.bucket.name,
            Key: message.object.key,
            Body: message.object.body
        }
    };
    s3qMessage(event, function(err, data){
        if(err){
            callback(err, null);
        }else{
            callback(null, data);
        }
        
    }); 

}


module.exports=getMessage;
module.exports.set=setMessage;