#!/user/bin/env node
var AWS= require('aws-sdk');
// var async = require('asyncawait/async');
// var await = require('asyncawait/await');
AWS.config.update({region: 'ap-southeast-2'});
//Teem objects
var tHttp=require('../lib/teem/http');
var tSTS=require('../lib/teem/sts');
var tEc2=require('../lib/teem/ec2');


var service='EC2';
var ec2 = eval('new AWS.'+service+'()');
var data={
    userid:56,
    appid: 2
};
var authUserid=56;
var userData=new Buffer("#! /bin/bash\nmkdir /backups");
console.log(userData.toString('base64'));

var sqldata={
    appId: 2,
    name:'test08080',
    aimageid: 'ami-7ac6491a',
    appInstanceType: 't2.nano',
    appSubnet: 'subnet-91d4cee6',
    appSecurityGroup: 'sg-f4f26193',
    configData:{
        "cloud":{
            "diskSize":200, 
            "userData":userData.toString('base64')
        }
    },
    authData: {"name":"AWSTEST1","arn":"arn:aws:iam::394588355535:role/TeemOps-TeemOps-IHCN47BKD64T","createdById":56,"createdByUsername":"kiwifellows","createdDate":"2016-08-03T22:41:53.380Z"}
};
console.log("sql data:"+JSON.stringify(sqldata.authData));
console.log(sqldata.configData.cloud.diskSize);

var configData=sqldata.configData;

var authData=sqldata.authData;
console.log(authData.arn);

console.log(typeof(sqldata.configData.userData)!=undefined ? sqldata.configData.userData : "undefuned userdata");

var qmsg={
    q: 'ec2',
    customerid: data.userid,
    userid: authUserid,
    RoleArn: authData.arn,
    body: {
        task: 'runInstances',
        params: {
            MinCount: 1,
            MaxCount: 1,
            ImageId: sqldata.aimageid,
            InstanceType: sqldata.appInstanceType,
            SubnetId: sqldata.appSubnet,
            SecurityGroupIds: [sqldata.appSecurityGroup],
            UserData: (typeof(configData.cloud.userData)!=undefined ? configData.cloud.userData : ""),
            BlockDeviceMappings: [
                {
                  DeviceName: '/dev/sda1',
                  Ebs: {
                    VolumeSize: configData.cloud.diskSize,
                    VolumeType: 'gp2'
                  }
                }
            ]

        },
        region: 'us-west-2',
        tags: [
            {
                "Key": "Name",
                "Value": sqldata.name.toString()
            },
            {
                "Key": "launched_by",
                "Value": "teemops"
            },
            {
                "Key": "teemops_app_id",
                "Value": sqldata.appId.toString()
            }
        ]
    }
};


tSTS(qmsg, function(err, data){
  if (err) {

    console.log("Error in STS" + err);
  }else{
    if (data.length!==0) {
        console.log(data);
        var credentials=data;
      tEc2(qmsg.body, credentials, function(err, data) {
        if (err) {
          
          console.log(err, data);
        }else{
            console.log("tEc2 Data"+data);
          if (data.length!==0) {
            var instance=data.Instances[0];
            //var output=jms.search(data, "Vpcs[].{ID: VpcId, IPRange: CidrBlock, Tags: Tags[*]}");
            //var res=tHttp.res(output);
            console.log(null, data);
            //now tag it
            var tagEvent = {
                task: 'createTags',
                params:
                {
                    Resources: [instance.InstanceId],
                    Tags: qmsg.body.tags
                },
                region: 'us-west-2'
            };
            console.log(JSON.stringify(tagEvent.params));
            tEc2(tagEvent, credentials, function(err, data){
                console.log("This is callback for tags");
                if(err){
                    console.log(err);
                }else{
                    console.log("Instance launch and tagging done");
                }
            });

          }else{
            console.log(null, "No data found.");
          }
        }
      });
      
    }else{
      console.log("Error Assuming Role", null);
    }
  }
  
});