{
  "AWSTemplateFormatVersion" : "2010-09-09",
  "Description" : "Execute a Lambda which enables bucket replication metrics",
  "Resources" : {
    "SetBucketMetrics" : {
      "Type": "AWS::CloudFormation::CustomResource",
      "Version" : "1.0",
      "Properties" :
        ${properties}
    }
  },
  "Outputs": {
    ${outputs}
  }
}
