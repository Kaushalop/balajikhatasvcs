# stock-manager
A set of services required for several functionalities.


### AWS Cognito Command to update the status to Confirmed

```
aws cognito-idp admin-set-user-password --user-pool-id us-east-2_cvEZkIU5P --username <> --password <> --permanent --region us-east-2
