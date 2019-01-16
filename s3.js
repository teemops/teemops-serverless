'use strict';

//config
var config = require('config-json');
config.load('./conf/conf.json');
config.load('./conf/output.json');
var Buckets={meta: config.get("TopsMetaBucketName"), main: "teemops"};

//Teem objects
var tS3q=require('./lib/teem/s3q');
var tNotify=require('./lib/teem/notify');
var helper=require('./lib/teem/helper');
var metaRegion=config.get("s3meta", "region");

/**
 * This works like an S3 cache that stores data for retrieval from any app,
 * Advantages:
 * Resiliency, cost, removes load off Dynamo DB and into more cost effective S3 for slow lazy updates of information.
 * Disadvantages:
 * A lot slower than using Redis, but we are not looking for read /latency performance here, this is for
 * event/ web socket background updates that don't require instant feedback.
 * 
 * Expected response time is around 250-500ms for this.
 */
module.exports.s3TaskFromDynamo = (event, context, callback) => {
    console.log(JSON.stringify(event));
    
    var eventType=event.Records[0].eventName;
    
    if(eventType!=='INSERT'){
        //abort mission :)
        console.log("Only event type INSERT is supported at this stage.");
        return context.succeed();
    }
    
    var message=event.Records[0].dynamodb.NewImage;
    var objectKey="customers/"+message.customerid.N.toString()+".json";
    var appid=message.statusid.N;
    var objectData={
        apps:[{
            id:appid,
            status: message.status.S
        }]
    };
    //check S3 meta data
    var params={
        region: metaRegion,
        bucket:{
            name: Buckets.meta
        },
        object: {
            key: objectKey
        }
    };
    var s3MetaMsg={
        region: metaRegion,
        bucket:{
            name: Buckets.meta
        },
        object:{
            key: objectKey,
            body: JSON.stringify(objectData)
        }
    };
    //check if the customers meta data store already exists at <bucketname>/customer/<id>
    //first step, get message from Queue which is provided by s3q, a custom S3 message broker.
    tS3q(params, function(err, data){
        if(err){
            //callback(err, null);
            if(err.statusCode==404){
                console.log("adding new key now");
                
                tS3q.set(s3MetaMsg, function(err, data){
                    if(err){
                        console.log("error saving meta data, retrying...");
                        callback(err, null);
                    }else{
                        console.log("Meta data saved to S3");
                        callback(null, data);
                    }
                });
            }else{
    
                console.log("Get S3 bucket Error caused by: "+JSON.stringify(err.statusCode));
                callback(err, null);
            }
            
        }else{
            var customerMeta=data.Body.toString();
            customerMeta=JSON.parse(customerMeta);
            var customerApps=customerMeta.apps;
            var found=false;
            for (var i = 0, len = customerApps.length; i < len; i++) {
                if(customerApps[i].id===appid){
                    customerMeta.apps[i]={
                        id:appid,
                        status: message.status.S
                    };
                    found=true;
                    console.log('updated customer app value: '+appid);
                }
            }
            if(!found){
                console.log('Not found, now adding: '+appid);
                customerMeta.apps.push({
                    id:appid,
                    status: message.status.S
                });
            }
            
            s3MetaMsg.object.body=JSON.stringify(customerMeta);
            console.log(customerMeta);
            tS3q.set(s3MetaMsg, function(err, data){
                if(err){
                    console.log("error saving meta data, retrying...");
                    callback(err, null);
                }else{
                    console.log("Meta data saved to S3");
                    callback(null, data);
                }
            });

        }
    });
}

