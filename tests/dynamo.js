var AWSDynamo= require('aws-sdk');
AWSDynamo.config = new AWSDynamo.Config();
AWSDynamo.config = new AWSDynamo.Config();
var message={
	notifyid: 123,
	timestamp: Date.now(),
	notification: "Another update Everything should be working now"
};
var notifyRegion='ap-southeast-2';
var event={
        region: notifyRegion,
        task: "put",
        params: {
            TableName: "topsnotify",
            Item: message,
            ReturnConsumedCapacity: "TOTAL"
        }
    };
var dynamoClient=new AWSDynamo.DynamoDB.DocumentClient({region:event.region});
/*
var params=event.params;
dynamoClient[event.task](params, function(err, data) {
    console.log("Starting callback of dynamoClient task "+event.task);
    if (err) {
        console.log("Inside dynamoClient Error"+JSON.stringify(err));

    }else{
        console.log("Data from dynamoClient"+ event.task+" "+JSON.stringify(data));
      if (data.length!==0) {
        //var output=jms.search(data, "Vpcs[].{ID: VpcId, IPRange: CidrBlock, Tags: Tags[*]}");


      }
    }
});
*/
var event={
    region: notifyRegion,
    task: "query",
    params: {
        TableName: "topsnotify",
        KeyConditionExpression: "notifyid = :id and #LogTimestamp >= :logtime",
        ExpressionAttributeNames: {
			'#LogTimestamp': 'timestamp'
		},
		ExpressionAttributeValues: {
			":id": 8,
			":logtime": 1495782769793
		},
		ScanIndexForward: false,
		Limit: 2
    }
};

event={
    region: notifyRegion,
    task: "query",
    params: {
        TableName: "topsnotify",
        KeyConditionExpression: 'notifyid = :id',
		ExpressionAttributeValues: {
			':id': 8
		},
		ScanIndexForward: false,
		Limit: 2
    }
};


var params=event.params;
dynamoClient[event.task](params, function(err, data) {
    console.log("Starting callback of dynamoClient task "+event.task);
    if (err) {
        console.log("Inside dynamoClient Error"+JSON.stringify(err));

    }else{
        console.log("Data from dynamoClient"+ event.task+" "+JSON.stringify(data));
      if (data.length!==0) {
        //var output=jms.search(data, "Vpcs[].{ID: VpcId, IPRange: CidrBlock, Tags: Tags[*]}");


      }
    }
});


