var  AWS= require('aws-sdk');

//jmes path query expressions
// use jms.search(inputdata, expression);
//useful for making nice readable output from aws sdk
var jms = require('jmespath');

function ec2RunTask(event, credentials, callback) {
    console.log("Credentials in EC2 lib: "+credentials);
    AWS.config.update({
        accessKeyId:credentials.accessKeyId,
        secretAccessKey:credentials.secretAccessKey,
        sessionToken:credentials.sessionToken,
        region:event.region
    });
    var ec2Client=new AWS.EC2();
    var params=event.params;
    
    /**
    Describes AMIs available in this AWS account based on the filters provided
    */
    ec2Client[event.task](params, function(err, data) {
        if (err) {
          callback(err, data);
        }else{
          if (data.length!==0) {
            //var output=jms.search(data, "Vpcs[].{ID: VpcId, IPRange: CidrBlock, Tags: Tags[*]}");
            callback(null, data);
          }else{
            callback(null, "No data found.");
          }
        }
    });
}

module.exports=ec2RunTask;