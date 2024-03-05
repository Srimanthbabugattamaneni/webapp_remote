packer {
  required_plugins {
    googlecompute = {
      source  = "github.com/hashicorp/googlecompute"
      version = ">=1"
    }
  }
}

source "googlecompute" "centos_stream_8" {

  project_id          = "devproject-414921"
  source_image_family = "centos-stream-8"
  ssh_username        = "centos"
  image_name          = "centos-stream-8-${formatdate("YYYY-MM-DD-hh-mm-ss", timestamp())}"
  image_description   = "new image"
  zone                = "us-east1-b"

}

build {
  sources = [
    "source.googlecompute.centos_stream_8"
  ]

    provisioner "file" {

    source      = "../csye6225.service"
    destination = "/tmp/csye6225.service"
  }

  provisioner "file" {
    source      = "setup.sh"
    destination = "/tmp/setup.sh"
  }

  provisioner "file" {
    source      = "../.env"
    destination = "/tmp/.env"
  }

  provisioner "file" {
    source      = "../webapp.zip"
    destination = "/tmp/webapp.zip"
  }

  provisioner "shell" {
    script = "setup.sh"
  }
}