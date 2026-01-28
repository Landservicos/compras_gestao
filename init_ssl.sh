#!/bin/bash

# Configuration
domains=("gestaoland.com")
rsa_key_size=4096
data_path="./certbot"
email="admin@gestaoland.com" # Change this to your email
staging=0 # Set to 1 for testing

echo "### Starting nginx with init config ..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.init-ssl.yml up -d nginx
echo

echo "### Requesting Let's Encrypt certificate for $domains ..."
#Join $domains to -d args
domain_args=""
for domain in "${domains[@]}"; do
  domain_args="$domain_args -d $domain"
done

# Select appropriate email arg
case "$email" in
  "")
    email_arg="--register-unsafely-without-email"
    ;;
  *)
    email_arg="--email $email"
    ;;
esac

# Enable staging mode if needed
if [ $staging != "0" ]; then staging_arg="--staging"; fi

docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm --entrypoint \
  "certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    $email_arg \
    $domain_args \
    --rsa-key-size $rsa_key_size \
    --agree-tos \
    --force-renewal" certbot
echo

echo "### Stopping temporary nginx ..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.init-ssl.yml stop nginx

echo "### Starting production nginx ..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d nginx
