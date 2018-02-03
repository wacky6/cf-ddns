cf-ddns
===
Simple DDNS powered by CloudFlare and ipify

## Install
    npm i -g wacky6/cf-ddns

## Usage
    cf-ddns --key <cf-key> --email <cf-email> --host ddns.example.com

## Docker
    docker pull wacky6/cf-ddns
    docker run -d -n cf-ddns wacky6/cf-ddns -k <cf-key> -u <cf-email> ddns.example.com
