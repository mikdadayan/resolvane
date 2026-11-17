# RDS TLS certificates

`rds-ca.pem` is the public AWS RDS CA bundle for eu-north-1, downloaded from:
https://truststore.pki.rds.amazonaws.com/eu-north-1/eu-north-1-bundle.pem

The Docker image includes it at `/app/server/certs/rds-ca.pem`. Database URLs
can use `sslmode=verify-full&sslrootcert=/app/server/certs/rds-ca.pem` to verify
the RDS server certificate and hostname. This bundle contains public certificates,
not passwords or private keys. Refresh it from AWS when updating trusted RDS CAs,
then rebuild and deploy the image.
