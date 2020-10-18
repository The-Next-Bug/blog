---
title: "A Blog Stack No One Should Build pt. 1 of ?"
date: 2020-10-18T10:36:24-05:00
draft: true
toc: true
images:
tags: 
  - blog
  - donotbuild
---

# The Idea

A few weeks back, I took a look at my personal hosting account and came to a realization. While
I have the skills I'd need to maintain a server and the Wordpress instance that I had running
on it, I really didn't want to that fight with keeping everything upgraded. My main web head
was still running Ubuntu 14.04 and I really wasn't in the mood to go through all the rigmarole
needed to upgrade it. Which would likely have required creating a new VM, migrating all the 
configuration and content across, and then migrating all the associated domains over to the new
IPs.

While this machine was serving 11 domains, they were mostly parking pages/redirects and 
all personal stuff that I'd never really done much with. It was all personal stuff I'd setup
back when I had more free time to play and didn't mind didn't mind mucking around with all a bit
of extra maintenance. I  was running [Gentoo](https://www.gentoo.org/) on my daily driver back
then and had been for quite sometime. I'd recommend giving it a shot if you haven't, but mostly
as an educational experience. These days I've come to the conclusion I have better things to do
with that ["extra" time]({{< extLink "Personal" >}}) (HA!). Still, I had this machine sitting out
there draining 20ish dollars a month and doing effectively nothing for me. So, it was time to 
do something about that.
 
I use [Digital Ocean]({{< extLink "DoReferral" >}}) as a hosting provider and they'd added a
number of interesting new options to their stack that I'd been wanting to play with for a long
time but had never had the opportunity. This looked like a good opportunity to get my feet wet
with new toys and actually do something useful with that DO account. There were a few things I
wanted in whatever replaced the aging blog stack:

- [Let's Encrypt](https://letsencrypt.org/) certificates on everything. I had this in place on
  the old site through a very hackish cronjob/shell script setup and I didn't really want to go 
  backwards from that.
- [Terraform](https://www.terraform.io/) for the infrastructure. My day job had been investing 
  heavily in Terraform and it was apparent I needed to at least be able to reason about Terraform
  configurations. Plus, I was pretty tired of manually mucking about with creating machines and
  configuring them by hand. I really wanted to be able to tear everything down and set it back up
  again if the need ever arose.
- [Kubernetes](https://kubernetes.io/) for deployment. I've worked with Docker and built some
  reasonably complex setups with a combination of Bash and bare Docker commands. (This was back
  before Docker bought out Fig and turned it into docker-compose.) Even further back, I'd messed
  with [Linux HA](http://www.linux-ha.org/wiki/Main_Page) and all the fun that comes with trying
  to make that work in a virtual environment without the right number of nodes. (Business
  constraints not technical ones.)
- [Digital Ocean]({{< extLink "DoReferral" >}}) as a provider. There are number of other
  providers our there, but I wasn't interested in switching out that layer of the stack. Most of
  my options would have either been comparably expensive or provided minimal advantages over
  what I was already using. Plus, I've been happy with DO and didn't see a need to move away. The
  one reason I've considered moving is that, at the time of this writing, DO load balancers and
  k8s clusters do not support IPV6.
- [Github](https://github.com) for code hosting. This was also a choice born out of expediency. I
  have a [Github]({{< extLink "PersonalGithub" >}}) account already and they added private
  repositories since the last time I needed one. Otherwise this would have been 
  [BitBucket](https://bitbucket.org/).
- Overall, I was looking to reduce the degree of maintenance that I **needed** to take care of
  personally. The old Ubuntu box was fine, but it required me to do big bursts of maintenance
  when OS upgrades were required. Something I just didn't want to deal with for a "toy" system.
  This was supposed to be useful, educational, and not more a great deal more work.
- Git Commit triggers build and deploy.

That's the basics. If all I were looking for were to get rid of the maintenance costs of
running a machine myself, there are any number of [alternate](https://www.blogger.com/)
[hosting](https://wordpress.com/) [options](https://pages.github.com/). For that matter, DO add
their own [App Hosting]({{< extLink "DoAppHosting" >}}) just as I was finishing up the building
out this pipeline. I do not recommend anyone build out a stack like this one and use it for
anything more than personal edification and learning. (Hence the title of this post!)

# Infrastructure

I had a [hosting/infrastructure provider]({{< extLink "DoReferral" >}}) already and knew I wanted
to work with [Terraform](https://www.terraform.io/) to handle overall configuration. This left me
with a choice. Did I want to spin droplets and configure them into a cluster myself or go with
DO's managed Kubernetes offering? Arguably, I could get by cheaper by creating smaller droplets
since the managed option requires DO's ten dollar droplets as the minimum size for cluster nodes.
But, that would leave me managing more of the infrastructure myself, coming up with an upgrade
path and just generally doing more work by hand than I wanted to mess with. Plus, I'm not exactly
an expert at administering one of these clusters and wasn't ready to dive into learning the right
way to set one up. There were already a number of new technologies that needed to be learned, and
limiting complexity (at least a little) seemed like a good idea. The managed option it was.

Next was the terraform side of things. There is a reasonably well documented
[terraform provider](https://registry.terraform.io/providers/digitalocean/digitalocean/latest/docs) for DO that seemed to fit the bill. Plus DO has nice
[tutorials](https://www.digitalocean.com/community/tutorials/how-to-use-terraform-with-digitalocean)
on how to use Terraform with their offerings. I already had the
[`doctl`](https://github.com/digitalocean/doctl) tool installed and connected to my account and
that made getting access to a pre-configured API token easier than it might have been in other
circumstances. The provider config looks like this:

{{< highlight tf >}}
data "local_file" "doctl_config" {
  # This path needs to be adjusted depending on platform and user.
  filename = pathexpand("/Users/jules/Library/Application Support/doctl/config.yaml")
}

locals {
  do_token = yamldecode(data.local_file.doctl_config.content).access-token
}

provider "digitalocean" {
  token = local.do_token
}
{{< / highlight >}}

Yes that's an explicit path to a config file that only works on one machine, or at least only on
a Mac with the same user as my personal one. In a real world, productized scenario, that's a
definite no-go. But this is an educational toy setup and I'm not a Terraform expert. It was 
enough to get me in the door and working.

Next was a question of state. Terraform needs a place to store it's internal record of what state
it left the infrastructure it manages in. This is where the state file comes into play. I could
have left the state file local on my machine, but that seemed like a recipe for disaster if
anything ever happened to this machine. I do have backups, but I'd rather not have to resort to
them, so remote state it was. Thankfully, Terraform can use anything that looks like an
[S3 bucket](https://www.terraform.io/docs/backends/types/s3.html) to store it's state and [DO's
spaces offering]({{< extLink "DoSpaces" >}}) exposes an API that's compatible.

For this one, I created the bucket by hand in the digital ocean UI instead of going through
Terraform. It might have been possible to use Terraform to create it, but that brings up a
chicken and egg question that I wasn't looking to answer at the time. (Might be worth 
experimenting with later). The configuration I used wound up looking like this:

{{< highlight tf >}}
terraform {
  backend "s3" {
    endpoint = "https://nyc3.digitaloceanspaces.com"
    key = "terraform.tfstate"
    bucket = "cs-terraform-backend"
    region = "us-east-1"
    profile = "digitalocean"
    skip_credentials_validation = true
  }
}
{{< / highlight >}}

This coupled with configuration for the aws cli tool that looked like this:

Directory Layout:
```
~/.aws
├── config
└── credentials

0 directories, 2 files
```

`~/.aws/config`:
{{< highlight ini >}}
[profile digitalocean]
region = us-east-1
{{< / highlight >}}

`~/.aws/credentials`:
{{< highlight ini >}}
[digitalocean]
aws_access_key_id=<some id>
aws_secret_access_key=<some key>
{{< / highlight >}}


Putting that all together gets a `provider.tf` like:
{{< highlight tf >}}
data "local_file" "doctl_config" {
  filename = pathexpand("/Users/jules/Library/Application Support/doctl/config.yaml")
}

terraform {
  backend "s3" {
    endpoint = "https://nyc3.digitaloceanspaces.com"
    key = "terraform.tfstate"
    bucket = "cs-terraform-backend"
    region = "us-east-1"
    profile = "digitalocean"
    skip_credentials_validation = true
  }
}

locals {
  do_token = yamldecode(data.local_file.doctl_config.content).access-token
}

# Providers:

provider "digitalocean" {
  token = local.do_token
}

{{< / highlight >}}

Next up is actually doing something with that configuration and that involves some mucking about
in [Namecheap](https://www.namecheap.com/) and playing with DO's DNS offering to let Terraform
manage the actual domains. Since I've already burned enough time on a Sunday afternoon writing 
this up, I'll save that for next post.

Chris S.
