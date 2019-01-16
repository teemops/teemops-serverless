#Teemops serverless cloudapi

#Create a set of new serverless microservices
'''
serverless create --template aws-nodejs --path myService
'''

#Deploy entire serverless stack in folder
'''
serverless deploy
#or
serverless deploy --stage beta
'''

#Deploy a single serverless function
#Must have already been deployed by serverless deploy command above
'''
serverless deploy function --function listVPC
'''

#Monitoring
Monitoring will capture any error and success and sent to AWS cloud watch.
The Lambda function will automatically capture errors and successes.


### Development Environment ###
Setup your dev environment to work offline without AWS connectivity.
This will ensure you can use a local Dynamo and Lambda

```
docker pull lambci/lambda
sls dynamodb install
sls dynamodb start -p 8000  --migrate true
```

### Testing functions locally ###
You can test functions locally using test data.
WARNING: Testing locally can still launch AWS assets such as EC2 instances.
Test data needs to be modified in tests/json folder.

```
#Test launching EC2 instance
serverless invoke local -f ec2Task -p tests/json/ec2.launch.json
```
