package test

import (
	"testing"
	"math/rand"
	"time"
	"github.com/gruntwork-io/terratest/modules/terraform"
)

var seededRand = rand.New(rand.NewSource(time.Now().UnixNano()))

func destroyInfra(terraformOptions *terraform.Options, t *testing.T) {
	terraform.Destroy(t, terraformOptions)
}

// RandomString string generates a random string using a supplied length
func RandomString(length int) string {
	charset := "abcdefghijklmnopqrstuvwxyz"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[seededRand.Intn(len(charset))]
	}
	return string(b)
}

func generateTerraformOptions(assumeRoleArn string, postfix string, fixtureName string) terraform.Options {
	terraformOptions := &terraform.Options{
		NoColor: true,
		Lock:    true,
		BackendConfig: map[string]interface{}{
			"key":      "modules/module-aws-cloudfront-edge-lambda/tests/fixures/" + fixtureName + "/" + postfix,
			"role_arn": assumeRoleArn,
		},
		TerraformDir: "fixture/",
	}

	return *terraformOptions
}
