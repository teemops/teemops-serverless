'use strict';

//config
var config = require('config-json');
config.load('./conf/conf.json');
config.load('./conf/output.json');
var Buckets={meta: config.get("TopsMetaBucketName"), main: "teemops"};

//Teem objects
var tHttp=require('./lib/teem/http');
var tSTS=require('./lib/teem/sts');
var tEc2=require('./lib/teem/ec2');
var tS3q=require('./lib/teem/s3q');
var tNotify=require('./lib/teem/notify');
var helper=require('./lib/teem/helper');

// var async = require('asyncawait/async');
// var await = require('asyncawait/await');

//we need to know the global Msg Key  of our message so we can check against stored, currently processing message
var GlobalMessageKey;

/**
 @author Ben Fellows <kiwifellows@gmail.com>
 @file ec2TaskFromSQS
 @description gets the SQS event from Lambda and sends to ec2Task handler then provides response: success/error
 @package cloudapi
 */
module.exports.ec2TaskFromSQS = (event, context, callback) => {
  if(typeof GlobalMessageKey==='undefined' || GlobalMessageKey===null){
    GlobalMessageKey='PLACEHOLDER';
  }
  console.log("Global Message Key Old: "+ GlobalMessageKey);
  console.log(JSON.stringify(event));
  var messageKey=event.Records[0].messageId;
  
  //We can check if this message has already been processed,
  //if it has then we can assume we are in a Lambda Retry
  if ( GlobalMessageKey === messageKey ) {
    console.log('SQS MessageId already been processed, Lambda auto retry detected. Aborting.');
    return context.succeed();
  } else {
    GlobalMessageKey = messageKey;
    console.log("MessageId Stored"+GlobalMessageKey);
  }
  
  //get body of S3 object which is a string and contains full s3q message
  var msg=JSON.parse(event.Records[0].body.toString());

  //run pretasks first, can be used to check if error should stop the task or continue
  preCheck(msg, context, function(err, data){
      console.log("BENF: "+ err+" DATA: "+data);
    if(err){
      //in case of this check for preTask we don't need to throw an error, but just callback with message
      var preError=err;
      //before callback we send a notification message
      console.log("Message Check failed, updating notifications:\n "+JSON.stringify(data));
      var notifyMsg={
        id:msg.body.notify.id,
        notification:msg.body.check.msg,
        type:msg.body.check.type
      };
      
      sendNotify(notifyMsg, function(err, data){
        console.log("Notification completed"+data);
        callback(null, preError);
      });

    }else{
      console.log("Check passed, now run ec2 Task");
      ec2Task(msg, context, function(err, data){
        console.log("RESULT FROM ec2Task: "+ err+" DATA: "+JSON.stringify(data));
        if(err){
          callback(err, null);
        }else{
          notifyMsg={
            id:msg.body.notify.id,
            notification:msg.body.notify.msg,
            type:msg.body.notify.type
          };
          sendNotify(notifyMsg, function(err, data){ 
            console.log("Notification for main task complete." + data);
          });

          var statusMsg={
              id: msg.body.notify.id,
              status: msg.body.notify.status,
              metadata:{
                customerid: msg.customerid,
                name: msg.name,
                region: msg.body.region,
                output: JSON.stringify(data),
                RoleArn: msg.RoleArn
              }
          };
          updateStatus(statusMsg, function(err, data){
              if(err){
                  console.log("Status update for main task error." + err);
                  callback(null, err);
              }else{
                  console.log("Status update for main task complete.");
                  callback(null, data); 
              }
              
          });

          var saveMessage={
            bucket: msg.body.save.bucket,
            path: msg.body.save.path,
            body: data
          };
          saveTaskOutput(saveMessage, function(err, data){
              if(err){
                  console.log("error when processing save message to S3 task"+ err);
              }else{
                console.log("Saved to S3");
              }
          });

        }
      });
    }

  });
    
}

/**
 * Tag an instance based on the value of instance Id provided in
 * the S3 object passed through the event object
 */
module.exports.ec2TagFromId = (event, context, callback) => {
  console.log(JSON.stringify(event));
  
  var eventType=event.Records[0].eventName;
  
  if(eventType!=='INSERT'){
      //abort mission :)
      console.log("Only event type INSERT is supported at this stage.");
      return context.succeed();
  }
  
  var message=event.Records[0].dynamodb.NewImage;
  
  var metadata=message.metadata.M;
  var instanceRegion=metadata.region.S;
  
  var instance=JSON.parse(message.metadata.M.output.S);
  console.log("This is metadata output: "+message.metadata.M.region.S);
  var instanceId=instance.Instances[0].InstanceId;

  //define tags to be used in tagging the instance
  var tags=[
    {
      Key: "Name", 
      Value: metadata.name.S
    },
    {
      Key: "teemops_id", 
      Value: message.statusid.N.toString()
    },
    {
      Key: "teemops_customer", 
      Value: metadata.customerid.N.toString()
    }
  ];
  var msg={
    RoleArn:metadata.RoleArn.S,
    body:{
      params: {
        Resources: [
          instanceId
        ],
        Tags: tags
      },
      region: instanceRegion,
      task: "createTags"
    }
  };

  ec2Task(msg, context, function(err, data){
    if(err){
      console.log("Tagging failed");
      callback(err, null);
    }else{
      console.log("Tagging completed");
      callback(null, true);
    }
  });

};

/**
 @author Ben Fellows <kiwifellows@gmail.com>
 @file getStatus
 Get the status of a running item with an ID
 ID could refer to anything
 @package cloudapi
 */
function getStatus(msg, callback){
  tNotify.getStatus(msg.id, function(err, data){ 
    if(err){
      callback("Get Status Error caused by: "+JSON.stringify(err), null);
    }else{
      callback(null, data);
    }
  });
}

/**
 @author Ben Fellows <kiwifellows@gmail.com>
 @file updateStatus
 Notify teemops notifications system with status update
 @package cloudapi
 */
function updateStatus(msg, callback){
  var statusMsg={
    statusid:msg.id,
    status:msg.status,
    metadata:msg.metadata
  };
  tNotify.setStatus(statusMsg, function(err, data){ 
    if(err){
      callback("Status Update Error caused by: "+JSON.stringify(err), null);
    }else{
      callback(null, data);
    }
  });
}



/**
 @author Ben Fellows <kiwifellows@gmail.com>
 @file sendNotify
 Notify teemops notifications system
 @package cloudapi
 */
function sendNotify(msg, callback){
  var notifyMsg={
    notifyid:msg.id,
    timestamp:Date.now(),
    notification:msg.notification,
    type:msg.type
};

  tNotify(notifyMsg, function(err, data){ 
    if(err){
      callback("Notification error");
    }else{
      callback(null, data);
    }
    
  });
}



/**
 @author Ben Fellows <kiwifellows@gmail.com>
 @file preCheck
 does pre check if defined in message
 and returns true if succesful which means operation can continue.
 @package cloudapi
 */
function preCheck(msg, context, callback){
  if(msg.body.check!==null || msg.body.check!==undefined){
    
    var thisMsg=msg.body.check;
    var conditions=msg.body.check.conditions;

    getStatus(thisMsg, function(err, data){
      if(err){
        callback(err, null);
      }else{
        console.log(JSON.stringify(data));

        /*
        If the status returns a value that meets a condition
        This means we need to return an error, because the condition check
        has failed.
        */
        if(conditions.indexOf(data) === -1){
          callback(null, true);
        }else{
          callback("check failed", null);
        }
        
      }
    });

  }else{
    callback(null, true);
  }
}

/**
 @author Ben Fellows <kiwifellows@gmail.com>
 @file ec2Task
 generic task handler which calls sts and ec2 generic handler libraries
 @package cloudapi
 */
function ec2Task (event, context, callback){
  console.log("Ec2Task event output:"+JSON.stringify(event));
  var message=event;
  message.region=event.body.region;

  tSTS(message, function(err, data){
    
    if (err) {
      callback(err, null);
    }else{

      if (data.length!==0) {
        console.log("Credentials in ec2Task:"+JSON.stringify(data));
        tEc2(message.body, data, function(err, data) {
          if (err) {
            callback(err, null);
          }else{
            if (data.length!==0) {
                //var output=jms.search(data, "Vpcs[].{ID: VpcId, IPRange: CidrBlock, Tags: Tags[*]}");
              //var res=tHttp.res(output);
              callback(null, data);
            }else{
              callback(null, "No data found.");
            }
          }
        });
        
      }else{
        callback("Error Assuming Role", null);
      }
    }
    
  });
}

/**
Saves output from a task to S3 bucket
*/
function saveTaskOutput(message, callback){
  var metaData=JSON.stringify(message.body).toString('base64');
  //now update S3 meta data
  var s3MetaMsg={
    bucket:{
      name: message.bucket
    },
    object:{
      key: message.path,
      body: metaData
    }
  };
  tS3q.set(s3MetaMsg, function(err, data){
    if(err){
      console.log("error saving meta data, retrying...");
      callback(err, null);
    }else{
      console.log("EC2 task meta data saved to S3");
      callback(null, data);
    }
  });
}
/**
 * 
 * @param {string} accountId AWS Account ID
 * @param {string} region AWS Region
 * @param {number} userId Teemops User ID
 */
async function createKeyPair(accountId, region, userId){
  var params={
    keyName: "teemops_"+userId,
    region: region
  }

}


