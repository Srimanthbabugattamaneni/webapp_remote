#!/bin/bash

# Create group csye6225 if it doesn't already exist
sudo groupadd -f csye6225

# Create user csye6225 and add to group csye6225
sudo useradd -m -g csye6225 -s /usr/sbin/nologin csye6225

# Copy the service file into the systemd directory
sudo cp /tmp/csye6225.service /lib/systemd/system/csye6225.service

# Install unzip
sudo dnf install -y unzip

# Install Apache HTTP Server
sudo dnf install httpd -y

# Enable Node.js 20 module and install npm
sudo dnf module enable -y nodejs:20
sudo dnf install -y npm

# Copy web application archive to /opt directory and extract it
sudo cp /tmp/webapp.zip /opt/webapp.zip
cd /opt || exit
sudo unzip webapp.zip
sudo cp /tmp/.env /opt

# Change directory ownership to user csye6225
sudo chown -R csye6225:csye6225 /opt

# Set directory permissions
sudo chmod -R 750 /opt

# Install Node.js dependencies and run tests
sudo npm install
sudo npm test

# Reload systemd, enable, and start Apache HTTP Server
sudo systemctl daemon-reload
sudo systemctl enable httpd
sudo systemctl start httpd

# Enable and start the custom service
sudo systemctl enable csye6225
sudo systemctl start csye6225

# Optionally, check the status of the custom service
sudo systemctl status csye6225
sudo journalctl -xe
