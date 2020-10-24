---
title: "A Blog Stack No One Should Build pt. 3 of ?"
date: 2020-10-24T10:58:24-05:00
publishDate: 2020-10-30
draft: false
toc: false
images:
tags:
  - blog
  - donotbuild
---

# Recap

In the last article, we left off with our DNS records setup in Digital Ocean and Name Cheap was
configured to point to those zones. The manual portion of that setup is pretty easy to deal 
with and is quite well
[documented on the DO side](https://www.digitalocean.com/docs/networking/dns/) of things.
In Name Cheap's UI it looks something like this.

{{< figure src="images/namecheap.jpg" >}}

Next it's time to spin up a Kubernetes cluster and actually put attach something to the domains.



