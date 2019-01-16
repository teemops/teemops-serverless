var  AWSEC2= require('aws-sdk');

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

function ec2RunTask(event, credentials, callback) {
    console.log("Credentials in EC2 lib: "+credentials);
    AWSEC2.config.update({
        accessKeyId:credentials.accessKeyId,
        secretAccessKey:credentials.secretAccessKey,
        sessionToken:credentials.sessionToken,
        region:event.region
    });
    var ec2Client=new AWSEC2.EC2();
    var params=event.params;
    console.log("EC2 Task Parameters: "+ JSON.stringify(params));
    /**
    Describes AMIs available in this AWS account based on the filters provided
    */
    ec2Client[event.task](params, function(err, data) {
        console.log("Starting callback of ec2Client task"+event.task);
        if (err) {
            console.log("Inside Error"+JSON.stringify(err));
          callback(err, null);
        }else{
            console.log("Data from EC2Client"+ event.task+" "+data);
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