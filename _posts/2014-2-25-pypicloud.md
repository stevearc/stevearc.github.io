---
layout: post
title: Pypicloud - Private PyPI + S3
description: A private PyPI server implementation that stores python packages in S3.
no_code: true
---
There comes a time in every engineer's career when they are faced with the
question: "How the f#@% am I going to deploy this application?". Don't worry,
that's normal. You might find yourself using coping mechanisms like `git pull`
and `scp`, but sooner or later the problem must be addressed.

The canonical solution for this problem is to use packages. Typically rpm's or
deb's; something linked to the operating system. For those of you deploying
python code, there is a third[<sup>1</sup>](#1) way: pip. Pip has a few distinct advantages over
OS packaging:

* **Versioning** - The index can have multiple versions of the same package.
    This makes rollbacks much easier.
* **Virtualenv** - You can install into a virtualenv, the best-practice for all
    python code.
* **OS-independent** - Works on any system with Python installed

If you use pip, you'll need to host your own Python Package Index (PyPI).
There are several options to choose from:
[pypiserver](https://pypi.python.org/pypi/pypiserver/1.1.5),
[pyshop](https://pypi.python.org/pypi/pyshop),
[mypypi](https://pypi.python.org/pypi/mypypi), and [a host of
others](https://pypi.python.org/pypi?%3Aaction=search&term=pypi&submit=search).
Most of these options are easy to set up and simply store the packages on disk.
I initially used one of these and had no complaints…until our servers went
down. Then I had to rebuild and re-upload a bunch of packages by hand in the
midst of an outage. After that experience, I decided that we *had* to use
something more stable for the backend. S3 came to mind.

I initially built PyPICloud to store packages in S3 and cache the package list
using SQLAlchemy, but decided to make it more generic. It now supports storing
packages in S3 or as files on disk, and it caches the package list using
SQLAlchemy or Redis. It has a full ACL, including groups and read/write
permissions on a per-package basis. Permissions and user credentials can be
specified in a config file, stored in a SQLAlchemy database, or delegated to
your own HTTP API. All of these components are pluggable, and it should be very
easy to write your own if you want to store packages in Cassandra, MongoDB, or
anything else.

I set up a live demo at [pypi.stevearc.com](https://pypi.stevearc.com). You can
browse the web interface and install packages from there. If you want to try
running it yourself, there are quick-start instructions [on
github](http://github.com/mathcamp/pypicloud#quick-start). If you have docker
installed you can start it with `docker run -p 8080:8080 stevearc/pypicloud`.

Code: [github.com/mathcamp/pypicloud](http://github.com/mathcamp/pypicloud)  
Docs: [pypicloud.rtfd.org](http://pypicloud.rtfd.org)

If people like it I might add more features, like LDAP support or something. If
you have any feature requests, [file an
issue](https://github.com/mathcamp/pypicloud/issues?state=open) on github!

<ul class="list-unstyled" style="font-size: 90%">
<li>
    <a name="1"><sup>1</sup></a> You could also use Twitter's
    <a href="http://youtu.be/NmpnGhRwsu0">PEX</a> format,
    <a href="https://www.docker.io/">docker</a> containers, or others that I
    probably haven't encountered.
</li>
</ul>
