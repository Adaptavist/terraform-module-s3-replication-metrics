package test

import (
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/gruntwork-io/terratest/modules/aws"
	"github.com/gruntwork-io/terratest/modules/terraform"
	"github.com/stretchr/testify/assert"
	"os"
	"testing"
)

var assumeRoleArn = os.Getenv("SANDBOX_ORG_ROLE_ARN")

func TestModule(t *testing.T) {

	postfix := RandomString(8)

	terraformOptions := generateTerraformOptions(assumeRoleArn, postfix, "s3-replication-metric")
	defer destroyInfra(&terraformOptions, t)
	terraform.InitAndApply(t, &terraformOptions)

	outputs := terraform.OutputAll(t, &terraformOptions)

	bucketName := outputs["bucket_name"].(string)
	region := outputs["region"].(string)

	assert.NotNil(t, bucketName)

	s3Client := aws.NewS3Client(t, region)

	bucketReplication, err := s3Client.GetBucketReplication(&s3.GetBucketReplicationInput{
		Bucket: &bucketName,
	})

	assert.Nil(t, err)
	assert.NotEmpty(t, bucketReplication.ReplicationConfiguration.Rules)

	for i := range bucketReplication.ReplicationConfiguration.Rules {
		rule :=  bucketReplication.ReplicationConfiguration.Rules[i]

		assert.EqualValues(t, "Enabled", *rule.Destination.ReplicationTime.Status)
		assert.EqualValues(t, 15, *rule.Destination.ReplicationTime.Time.Minutes)

		assert.EqualValues(t, "Enabled", *rule.Destination.Metrics.Status)
		assert.EqualValues(t, 15, *rule.Destination.Metrics.EventThreshold.Minutes)
	}
}
