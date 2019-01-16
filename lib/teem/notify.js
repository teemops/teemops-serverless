/*
Purpose: Publish/Sub to Notifications
Notifications used for realtime status notifications in the 
App And API Event Subscription model.

*/
var AWSDynamo= require('aws-sdk');
AWSDynamo.config = new AWSDynamo.Config();

//jmes path query expressions
// use jms.search(inputdata, expression);
//useful for making nice readable output from aws sdk
var jms = require('jmespath');

//config
var config = require('config-json');
switch(process.env.MODE){
    case "prod":
        config.load('./conf/conf.prod.json');
        break;
    case "test":
        config.load('./conf/conf.test.json');
        break;
    case "dev":
        config.load('./conf/conf.json');
        break;
    default:
        config.load('./conf/conf.json');
}

var Tables={notify: config.get("notify", "table"), status: config.get("notify", "status")};
var notifyRegion=config.get("notify", "region");


function dynamoMessage(event, callback) {
    AWSDynamo.config = new AWSDynamo.Config();
    var dynamoClient=new AWSDynamo.DynamoDB.DocumentClient({region:event.region});
    var params=event.params;
    
    /**
    dynamoClient [task] function is a generic Dynamo task handler
    */
    dynamoClient[event.task](params, function(err, data) {
        console.log("dynamoMessage Task: "+event.task)
        console.log("dynamoMessage Event: "+JSON.stringify(event));
        
        if (err) {
            console.log("dynamoMessage Error: "+JSON.stringify(err));
          callback(err, null);
        }else{
            console.log("dynamoMessage Data: "+JSON.stringify(data));
          if (data.length!==0) {
            callback(null, data);
          }else{
            callback(null, null);
          }
        }
    });
}

/**
 *update the status of something with an id e.g. appid
 * Example:
 * var msgStatus={
 *  statusid: 123 #Is usually appid
    status: "STARTED" #status of app
 }
 **/
function setStatus(message, callback) {
	var event={
        region: notifyRegion,
        task: "put",
        params: {
            TableName: Tables.status,
            Item: {
            	statusid: message.statusid,
            	timestamp: Date.now(),
                status: message.status,
                metadata: message.metadata
            },
            ReturnConsumedCapacity: "TOTAL"
        }
    };
    dynamoMessage(event, function(err, data){
        if(err){
            callback(err, null);
        }else{
            callback(null, data);
        }
        
    }); 
}

/**
 * Gets STATUS for a given ID
 * @param {*} statusid a statusid, usually appid or something else
 * @param {*} callback 
 */
function getStatus(statusid, callback) {

    var event={
        region: notifyRegion,
        task: "query",
        params: {
            TableName: Tables.status,
            KeyConditionExpression: "statusid = :id",
			ExpressionAttributeValues: {
				":id": statusid
			},
			ScanIndexForward: false,
			Limit: 1
        }
    };
    dynamoMessage(event, function(err, data){
        if(err){
            if(err.statusCode===400){
                var status='EMPTY';
                callback(null, status);
            }else{
                callback(err, null);
            }
            
        }else{
            if(data.Count===0){
                var status='EMPTY';
                callback(null, status);
            }else{
                var status=data.Items[0].status;
                callback(null, status);
            }
            
        }
        
    }); 
}

/**
Sets Notification value
e.g.
var message={
    notifyid: 123,
    timestamp: Date.now(),
    notification: "Just letting you know the app started OK.",
    type: info
}
*/
function sendMessage(message, callback){

	var event={
        region: notifyRegion,
        task: "put",
        params: {
            TableName: Tables.notify,
            Item: message,
            ReturnConsumedCapacity: "TOTAL"
        }
    };
    dynamoMessage(event, function(err, data){
        if(err){
            callback(err, null);
        }else{
            callback(null, data);
        }
        
    }); 
}

/**
Gets last 10 or so notifications for an ID and sorts 
by timestamp DESCENDING
*/
function getMessage(message, callback){
	//limit messages to 10 by default unless has been set
	message.limit=(message.limit===undefined ? 10 : message.limit);
	var event={
        region: notifyRegion,
        task: "get",
        params: {
            TableName: Tables.notify,
            KeyConditionExpression: "notifyid = :id",
			ExpressionAttributeValues: {
				":id": message.notifyid
			},
			ScanIndexForward: false,
			Limit: message.limit
        }
    };
    dynamoMessage(event, function(err, data){
        if(err){
            callback(err, null);
        }else{
            callback(null, data);
        }
        
    }); 
}



module.exports=sendMessage;
module.exports.send=sendMessage;
module.exports.get=getMessage;
module.exports.status=getStatus;
module.exports.getStatus=getStatus;
module.exports.setStatus=setStatus;
