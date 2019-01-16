var  AWSSTS= require('aws-sdk');
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

var externalId=config.get("ExternalId");

var sts= new AWSSTS.STS();

const sessionName="Teemops_serverless";

function stsAssume(event, callback) {
    console.log("RoleARN: "+event.RoleArn);
    var params={
      DurationSeconds: 900,
      RoleArn: event.RoleArn,
      ExternalId: externalId,
      RoleSessionName: sessionName
    };
    sts.assumeRole(params, function(err, data){
      if (err) {
        callback(err, null);
      }else{
        if (data.Credentials.length!==0) {
          console.log("Credentials:"+ JSON.stringify(data.Credentials));
          console.log("Region: "+event.region);
          var cb={
            accessKeyId:data.Credentials.AccessKeyId,
            secretAccessKey:data.Credentials.SecretAccessKey,
            sessionToken:data.Credentials.SessionToken,
            region:event.region
          };
          callback(null, cb);
        }else{
          callback("Error Assuming Role", null);
        }
      }  
    });
}

module.exports=stsAssume;