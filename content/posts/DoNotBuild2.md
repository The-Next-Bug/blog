---
title: "A Blog Stack No One Should Build pt. 2 of ?"
date: 2020-10-19T05:35:31-05:00
publishDate: 2020-10-25
draft: true
toc: false
images:
tags: 
  - blog
  - donotbuild
---

# Recap

In the last article, we went through a subset of the technologies involved in this project:
- [Let's Encrypt](https://letsencrypt.org/)
- [Terraform](https://www.terraform.io/)
- [Kubernetes](https://kubernetes.io/)
- [Digital Ocean]({{< extLink "DoReferral" >}})
- [Github](https://github.com)

We also setup some very basic Terraform files to get connected to Digital Oceans API. If it
wasn't fully clear from that last post, this is not meant to be a tutorial on how to build out
an extremely over/under engineered blog running in Kubernetes. It's mostly meant as a recap of
what was built, and why you probably should do this in the first place. Seriously, if you're
considering running your own site, hunt up a nice Wordpress hosting service or even look at
[Digital Ocean's new App hosting]({{< extLink "DoAppHosting" >}}) you'll be better off for it in
the end. If you're still here, I'll assume you're interested in my particular trials and 
tribulations with getting this mess working and a few of the lessons I learned along the way. 

# More Infrastructure

Without a domain name of some kind, you can't have a much of a site. Well, you can but it's
extremely unlikely that anyone will be able to find it or will be very interested in doing much
with it when they do. So, the need of a domain and the associated DNS records was a given and 
consequently I needed a way to tie those back to the actual IP addresses of the "machine" that
served up the actual resources.

I use [Namecheap](https://www.namecheap.com/) as a registrar for any domains that I own. Years
back, I made the mistake of purchasing a domain through my hosting provider and found myself
stuck maintaining a hosting account with that provider for significantly longer than I wanted
because of some rules about needing hosting to have a domain registered with them. It's been
long enough that I don't fully remember the details but it was enough to drive home the idea
that you never want to mix hosting and domain registrations.

DNS is a little safer since you can reconfigure a domain to point at whatever DNS servers you 
want. Still, up to this point I'd been using Namecheap's own DNS product rather than trying to 
host my own or leverage Digital Oceans. It was fine because the IP addresses weren't changing
all that often since I wasn't in the habit of replacing/upgrade droplets (Digital Ocean's name
for their brand of virtual machine) all that often. A floating IP would likely have been the
right solution here, but that would add another 4 dollars a month to the bill and I had other
reasons that interacting with DNS might be useful down the road (Let's Encrypt). Thankfully, the 
Digital Ocean Terraform provider had the answer I was looking for in the form of 
[`digitalocean_domain`](https://registry.terraform.io/providers/digitalocean/digitalocean/latest/docs/resources/domain)
and [`digitalocean_record`](https://registry.terraform.io/providers/digitalocean/digitalocean/latest/docs/resources/record) resources.

In DO's parlance, a domain is the equivalent of a zone and can be used to host a set of records
which are just what they sound like: [A](https://www.cloudflare.com/learning/dns/dns-records/dns-a-record/), AAAA the IPV6 form of A, [CNAME](https://www.cloudflare.com/learning/dns/dns-records/dns-cname-record/), etc. I seemed pretty straight forward to setup a simple [Terraform module](https://www.terraform.io/docs/configuration/modules.html)
to start configuring my domains. 

Module Layout:
```
modules/dns/
├── main.tf
├── outputs.tf
├── variables.tf
└── versions.tf

0 directories, 4 files
```

`versions.tf` was just a reference to the DO provider:
{{< highlight tf >}}
terraform {
  required_providers {
    digitalocean = {
      source = "digitalocean/digitalocean"
    }
  }
  required_version = ">= 0.13"
}
{{< / highlight >}}

`variables.tf` covered a few things I wanted to know/configure about particular domains:
{{< highlight tf >}}
variable "name" {
  type = string
}

variable "ipv4" {
  type = string
  default = ""
}

variable "ttl" {
  type = number
  default = 600
}
{{< / highlight >}}

`name` here was the domain I being configured, `ipv4` the ipv4 address to point at, and `ttl` the
number of seconds that any cached resolution should be valid. I wanted that last number small
since  I was experimenting with new configurations and DO doesn't charge by the query anyhow.

I setup `outputs.tf` with the to dump the actual domains configured in the module with a couple
of caveats:
{{< highlight tf >}}
output "dns_domains" {
  value = toset([
    for item in digitalocean_record.records:
      replace(replace(item.fqdn, "@.", ""), "*.", "")
    ])
}
{{< / highlight >}}

The [`replace`](https://www.terraform.io/docs/configuration/functions/replace.html) calls will
make more sense after you see the resource definitions. The main point of that block is to
replace any instances of `@.` and `*.` with nothing and then use [`toset`](https://www.terraform.io/docs/configuration/functions/toset.html)
to eliminate any duplicate entries. Originally I had some idea of using this list to feed into
Let's Encrypt or something similar, but that didn't turn out to be needed. I left the output
behind mostly because I had written it and couldn't come up with a good reason to get rid of it.

The `module.tf` file defines some local variables and two resources, though one is a loop:
{{< highlight tf >}}
locals {
  base_records = [
    {
      type = "A"
      name = "@"
      value = var.ipv4 
    },
    {
      type = "CNAME"
      name = "*"
      value = format("%s.", var.name)
    },
    {
      type = "CNAME"
      name = "www"
      value = format("%s.", var.name)
    }
  ]
  
  records = local.base_records
}

resource "digitalocean_domain" "default" {
  name = var.name
}

resource "digitalocean_record" "records" {
  count = length(local.records)

  domain = digitalocean_domain.default.name
  type = local.records[count.index].type
  name = local.records[count.index].name 
  value = local.records[count.index].value

  ttl = try(local.records[count.index].ttl, var.ttl, 600)
}
{{< / highlight >}}

This is a bit crude from where I had originally wanted it to go and has a few left over artifacts
from that original plan, but it works fine as is. The most obvious oddity is `base_records` and 
`records`. Originally, `records` was supposed to be composed of the entries listed in
`base_records` plus a possible list of additional, extra entries that could be fed in as a
variable when the modules was called. That didn't work out well, neither did the idea of 
conditionally adding `A` or `AAAA` records based on the presence or absence of an ipv4/6 address.
I kept running into problems where Terraform could not determine the number of items in count
until the apply had actually finished and hence could not run `terraform apply` in the first
place without jumping through some nasty hoops.

Instead, I wound up simplifying things significantly with the hopes of being able to add back in
some of the features I wanted down the road. DO didn't offer IPV6 on their LoadBalancer product
anyhow, and I already knew I would need to use that because of the way [kubernetes works](https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/). Plus, I 
knew that DO's kubernetes cluster could easily scale up/down and replace nodes more or less at
random. This meant I wouldn't have an easy way to know what nodes were at what IPs on my own.
DO's LoadBalancers could easily track the kuberentes worker pool and the nodes that were
associated with it, but that product is limited to IPV4. So, there really wasn't much point to
trying to do the fancy stuff right now anyhow.

Out in the top level of the project, I added a list of domain entries like (pruned for brevity):
{{< highlight tf >}}
locals  {
  lb_ipv4 = module.cluster.lb_ingress.ip
}

locals {
  domains = [
    {
      name = "thenextbug.com"
      ipv4 = local.lb_ipv4
    },
    {
      name = "chrissalch.com"
      ipv4 = local.lb_ipv4 
    },
    {
      name = "arlaneenalra.com"
      ipv4 = local.lb_ipv4 
    }
  ]
}

{{< / highlight >}}

And proceeded to reference the module like so:
{{< highlight tf >}}
module "dns" {
  count = length(local.domains)

  source = "./modules/dns/"

  name = local.domains[count.index].name
  ipv4 = local.domains[count.index].ipv4

  depends_on = [ module.cluster ]
}

{{< / highlight >}}

The references to `module.cluster` come into play down the road when we talk about the actual
kubernetes cluster and how it was deployed. The initial form of this just had 
`module.cluster.lb_ingress.ip` hard coded to the IP of my old droplet and didn't have the 
`depends_on` clause at all. Surprisingly or not, it `terraform apply` created the domain entries 
and expected records just like I wanted it to. Well, after having fought with and stripped out 
some dynamic tricks that turned out to be much less useful than I thought the would be at first.
A bit of reconfiguration in the Namecheap UI and I had Terraform managing my DNS.

The next step on this little journey was to get create the cluster itself and start playing with
kubernetes. But that's for next time.
