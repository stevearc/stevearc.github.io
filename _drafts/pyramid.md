---
layout: post
title: 'Python Web Frameworks: Why I Chose Pyramid'
description: An explanation of why I chose to use Pyramid over Django, Flask, Cherrypy, and all other competitors.
no_code: true
---
Once upon a time I was asked to create a website using Python. It was suggested
that I use [Tornado](http://www.tornadoweb.org/en/stable/), and, idiot that I
was, I did. I didn't do comparison shopping, I didn't find out the pros and cons,
I just went with the suggestion.  
**Pro-tip**: *never do that*

Several months down the line, elbow-deep in Tornado, I made the call that we
had to migrate to something else. Tornado is great for one thing: asynchronous
IO. If you don't need persistent connections to your website, it gives you
nothing. I mean literally, nothing. It's a very bare-bones server/framework,
and has very few convenience methods of any kind. And the real nightmare: all
your libraries have to be specifically written to be Tornado-compatible. As you
can imagine that started off unpleasant and ended up unbearable in a hurry.
Since I was burned so badly last time by not doing my own research, I decided
to do *extensive* research before making any decisions this time.

### The Lineup

I decided that the major criterion that I would be looking for in a framework
can be boiled down to four things:

* **Modular** - Pieces of the framework should be pluggable. I like being able
    to use the best tool for the job; not the tool the framework authors liked.
    If I need SQLAlchemy, I should be able to use it. If I want to use Jinja2,
    Mako, and/or Spitfire as the templating engine, that should be easy.
* **Hackable** - How flexible is the framework? If I need some crazy custom
    behavior, is it easy to modify how the framework works?
* **Simple** - This doesn't mean small, it means understandable. It should be
    easy to look at code and see what the framework is doing. Minimal magic.
    (This usually also affects how hackable a framework is. Mo' magic mo'
    problems).
* **Popular** - Popular frameworks are better supported. If you run into a
    problem, you want someone else to have already run into that exact same
    problem and solved it for you.

After some Googling around, I came up with a list of candidates:

#### Django
Django is the big player. It's the largest, most popular web framework for
python. It's well-supported, has tons of documentation, and claims to ship with
everything you need.

The downside? It's not that modular. It was built to be the be-all, end-all
solution for everything. The Django design philosophy is that if you design
components that fit together tightly, they will work better together than
components that were built independently.

I ran into many PyCon talks that mention large, monolithic Django apps, which
is the opposite of what I wanted to build. I wanted to create many
smaller, service-oriented apps that make calls to each other. You could
probably do this with Django, but that's not what it's made for.

Lastly, there is definitely some magic going on. I have not used Django
extensively, but I would be hard-pressed to tell you what is happening with
settings.py. Abstractly, yes, I know what it's doing, but it's implementation
is magic and I don't know what will happen if I need slightly nonstandard
behavior.

#### Web2py
I didn't see any names I recognized using it
didn't look modular
didn't look popular


#### Web.py
Looked like a smaller community, not many plugins or tools, and I didn't see
any big companies that I recognized using it. Reddit *used* to use it, but then
they dropped it, which is not a mark in it's favor. Also, I just *hate* the
syntax. Hate it. I think I must be the exception here, but it looks clunky and
ugly to me.

YES I AM THAT SHALLOW

#### Flask
Flask looked promising. It's the most popular microframework, and has a pretty
active community. It has a design philosophy that focuses on modularity, and
there are tons of plugins for it. The only hesitation I had was I wasn't sure
how well it would do with larger applications, since I didn't see many examples
of people using it as such.

#### Pyramid
I initially looked up Pylons, because that's what Dropbox was using while I was
there (and still using? Probably?). Pylons led me to Pyramid, the successor to
Pylons, and the result of merging it with repoze.bfg (which I'd never heard
of). It has the same pay-for-what-you-eat design as the microframeworks, but it
was built with large applications in mind as well. It's *extremely* modular,
has a large library of plugins, and a fairly sizeable community.

#### Turbogears
Looked like Pyramid but less good
No names I recognized using it

#### Cherrypy
Looked to have a similar style to Flask, but with fewer plugins and a smaller
community. It has its own WSGI server, which is cool, but not a selling point
for us.

#### Bottle
Bottle looked like Flask, but less popular. Seemed interesting for embedding an
entire server for ease-of-distribution, but didn't seem to have any advantages
otherwise.

### Trial Run
Of these, I decided to take a closer look at Pyramid and Flask (I probably
should have also looked closer at Django, but at the time I felt like the
philosophical disagreement was too large). I built a small web application with
each of them.

#### Flask
Building the app was easy. The documentation is great and the syntax is simple.
I managed to get something up and running pretty quickly.

#### Pyramid
Building this app was also easy, although it required a bit more boilerplate.
It was still pretty easy to get started, thanks to pcreate and scaffolds.

### Aftermath

I've now been using Pyramid for about a year and I have only come to love it more.

I honestly don't understand why Pyramid's url traversal has such a reputation
for being opaque. It's simple: there's dicts. Granted, the route name and the
route subpaths are a little tricky, but the basic concept is really simple.

I always end up needing to copy/paste a bit of boilerplate from my old projects
(for SQLAlchemy, beaker, jinja2, etc.)

Certain operations are not so simple (pyramid_duh)

I have yet to want to do something and find it not possible or even ugly to implement
