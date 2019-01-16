'use strict';
var AWS= require('aws-sdk');
AWS.config = new AWS.Config();

/*
Run example in cli:
# node tests/checkstatus.js | python -m json.tool
*/
//Teem objects
var tNotify=require('../lib/teem/notify');
var tS3q=require('../lib/teem/s3q');
const fs = require('fs');
var path = require('path');

var conditions=['STARTED', 'STOPPED', 'STARTING', 'STOPPING', 'RESTARTING', 'DELETING'];
var status='DELETED';

console.log(conditions.indexOf(status));
tNotify.getStatus(9, function(err, data){ 
    if(err){
        console.log("Get Status Error caused by: "+JSON.stringify(err));
    }else{
        console.log(JSON.stringify(data));
        //status=data.Items[0].status;
        //console.log(status);
        
        if(conditions.indexOf(status) ===-1){

        }
    }
});
//COMMENT OUT if want to continue
process.exit();
var jsonPath=path.join(__dirname, '..', 'tests', 'json', 'dynamo.json');
var filedata=fs.readFileSync(jsonPath);
var event=JSON.parse(filedata);
console.log(JSON.stringify(event.Records[0].dynamodb.NewImage));
var message=event.Records[0].dynamodb.NewImage;
console.log(message.customerid.N);
//COMMENT OUT if want to continue
process.exit();

//CODE BREAK
var appid=message.statusid.N;
var Buckets={
    meta: "teemops-meta-beta"
};
var objectKey="customers/55.json";
var objectData={
    apps:[{
        id:appid,
        status: message.status.S
    }]
};
//check S3 meta data
var params={
    region: 'us-west-2',
    bucket:{
        name: Buckets.meta
    },
    object: {
        key: objectKey
    }
};
var s3MetaMsg={
    region: 'us-west-2',
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
                    //callback(err, null);
                }else{
                    console.log("Meta data saved to S3");
                    //callback(null, data);
                }
            });
        }else{

            console.log("Get S3 bucket Error caused by: "+JSON.stringify(err.statusCode));
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
                    status: 'STARTED'
                };
                found=true;
                console.log('updated customer app value: '+appid);
            }
        }
        if(!found){
            console.log('Not found, now adding: '+appid);
            customerMeta.apps.push({
                id:appid,
                status: 'STARTED'
            });
        }
        
        s3MetaMsg.object.body=JSON.stringify(customerMeta);
        console.log(customerMeta);
        tS3q.set(s3MetaMsg, function(err, data){
            if(err){
                console.log("error saving meta data, retrying...");
                //callback(err, null);
            }else{
                console.log("Meta data saved to S3");
                //callback(null, data);
            }
        });

        //customerMeta=JSON.stringify(customerMeta);
        console.log(customerMeta.apps[0]);
    }
});
