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

sudo curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
sudo bash add-google-cloud-ops-agent-repo.sh --also-install
 
logger=$(cat << EOF
logging:
  receivers:
    webapp-receiver:
      type: files
      include_paths:
        - /var/log/webapp/webapp.log
      record_log_file_path: true
  processors:
    webapp-processor:
      type: parse_json
      time_key: time
      time_format: "YYYY-MM-DDTHH:mm:ss.SSSZ"
    move_severity:
      type: modify_fields
      fields:
        severity:
          move_from: jsonPayload.severity
  service:
    pipelines:
      default_pipeline:
        receivers: [webapp-receiver]
        processors: [webapp-processor, move_severity]
EOF
)
 
# Backup the old config.yml file
sudo cp /etc/google-cloud-ops-agent/config.yaml /etc/google-cloud-ops-agent/config.yaml.backup
 
# Create a new config.yml file
echo "$logger" | sudo tee /etc/google-cloud-ops-agent/config.yaml >/dev/null
 
# Set permissions for the new config.yml file
sudo chown -R csye6225:csye6225 /etc/google-cloud-ops-agent/config.yaml
 
sudo mkdir -p /var/log/webapp
 
sudo touch /var/log/webapp/webapp.log
 
sudo chown -R csye6225:csye6225 /var/log/webapp
 
sudo systemctl enable google-cloud-ops-agent
sudo systemctl start google-cloud-ops-agent
sudo systemctl restart google-cloud-ops-agent

# Reload systemd, enable, and start Apache HTTP Server
sudo systemctl daemon-reload


# Enable and start the custom service
sudo systemctl enable csye6225
sudo systemctl start csye6225

# Optionally, check the status of the custom service

sudo systemctl status csye6225
sudo journalctl -xe

