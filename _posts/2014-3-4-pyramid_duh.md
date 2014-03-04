---
layout: post
title: A Pyramid Extension that Everyone Needs
description: A python package that contains request argument parsing and other useful utilities for Pyramid.
---
I love Pyramid. It's an incredibly modular, extensible, and minimalist web
framework that's built for all sizes of web applications. The design philosophy
is based around making it possible for developers to use whatever tool is best
for the job, while still keeping simple tasks easy. It's a plugin-based
framework, rather than the 'batteries-included' style of Django.

That said, there are some things that I think Pyramid should really include in
its core library, because I find myself using them everywhere. Eventually I got
tired of copy-pasting this code everywhere and just stuck it all into its own
package, which I called
[pyramid_duh](https://pypi.python.org/pypi/pyramid_duh/). Because I can't think
of a single Pyramid app that wouldn't want them.

### Request Arguments
There is no sugar surrounding request arguments. This is an [intentional design
choice](http://docs.pylonsproject.org/projects/pyramid/en/latest/designdefense.html#pyramid-views-do-not-accept-arbitrary-keyword-arguments),
but I don't like it. I think that argument sugar should be available, even if
it's not enabled by default. Let's look at a standard view function.

{% highlight python %}
from datetime import date
from pyramid.settings import asbool
import json

@view_config(route_name='register_user')
def register_user(request):
    try:
        username = request.params['username']
        password = request.params['password']
        birthdate = date.fromtimestamp(int(request.params['birthdate']))
        subscribe_to_newsletter = asbool(request.params.get('subscribe', True))
        metadata = json.loads(request.params.get('metadata', '{}'))
    except KeyError:
        raise HTTPBadRequest("Missing argument")
    except ValueError:
        raise HTTPBadRequest("Malformed birthdate or metadata")
{% endhighlight %}

That is just *all kinds* of ugly. Also, passing up a dict for `metadata` is
more complicated than it seems. If you send up `application/json` you have to
use `request.json_body()` instead of `request.params`. If you json-encode the
argument, you now have to json-decode it like in the example above. Let's
simplify all that.

{% highlight python %}
from datetime import date 

@view_config(route_name='register_user')
def register_user(request):
    username = request.param('username')
    password = request.param('password')
    birthdate = request.param('birthdate', type=date)
    subscribe_to_newsletter = request.param('subscribe', True, type=bool)
    metadata = request.param('metadata', {}, type=dict)
{% endhighlight %}

Look at that. Doesn't that look reasonable? Doesn't that look like something
that should be possible by default in Pyramid? And it gets better!

{% highlight python %}
from datetime import date
from pyramid_duh import argify

@view_config(route_name='register_user')
@argify(birthdate=date, subscribe=bool, metadata=dict)
def register_user(request, username, password, birthdate, subscribe=True, metadata=None):
    # never use mutable values for argument defaults in Python :)
    metadata = metadata or {}

{% endhighlight %}

[*ohhhh yeahhhhhhh*](http://www.youtube.com/watch?v=8Q7FFjUpVLg)

Yes. Yes this is much better. And the best part is that it turns your unit
tests from this:

{% highlight python %}

def test_register_user(self):
    request = DummyRequest()
    request.params = {
        'username': 'dsa',
        'password': 'conspiracytheory',
        'birthdate': date(1989, 4, 1),
    }
    ret = register_user(request)

{% endhighlight %}

To this:

{% highlight python %}
def test_register_user(self):
    request = DummyRequest()
    ret = register_user(request, 'dsa', 'conspiracytheory', date(1989, 4, 1))
{% endhighlight %}

But wait! Is there more?

You bet. [Read the
docs](http://pyramid-duh.readthedocs.org/en/latest/topics/request_parameters.html)
to learn how to inject custom objects and perform type validation.

### Subpath Matching

One of the problems people have with pyramid's traversal is that it doesn't
allow you to set view predicates on the subpath.

{% highlight python %}

    @view_config(context=MyCtxt, name='foobar')
    def my_view(request):
        # do stuff

{% endhighlight %}

Let's say that `MyCtxt` corresponds to a url of `'/mything'`. What urls
will map to `my_view`?

* `/mything/foobar` - Ok, that's good
* `/mything/foobar/` - Oh, trailing slashes too! That's cool.
* `/mything/foobar/baz` - Wait...what?
* `/mything/foobar/baz/barrel/full/of/monkeys` - I don't...I didn't tell you to do that...
* `/mything/foobar/baz/barrel/full/of/monkeys/oh/god/why/please/make/it/stop`

That's not really okay. I'm not okay with that.

#### The Solution
{% highlight python %}

    @view_config(context=MyCtxt, name='foobar', subpath=())
    def my_view(request):
        # do things

{% endhighlight %}

Huh...that looks easy. What does it match?

* `/mything/foobar`
* `/mything/foobar/`

Oh hey, that's exactly what I wanted it to do with no crazy unexpected
behavior. Awesome. Here's a more complex example:

{% highlight python %}

    @view_config(context=MyCtxt, name='foobar', subpath=('type/(post|tweet)/r', 'id/*'))
    def my_view(request):
        item_type = request.named_subpaths['type']
        id = request.named_subpaths['id']
        # do things

{% endhighlight %}

This matches `/myctxt/foobar/(post|tweet)/{id}` and sticks them in `request.named_subpaths`. It matches `type` as a regex and `id` as a glob.

There are a few more nuggets inside `pyramid_duh`, but these are the big ones.
It is, of course, all on github and thoroughly documented.

Code: [github.com/stevearc/pyramid_duh](http://github.com/stevearc/pyramid_duh)  
Docs: [pyramid_duh.rtfd.org](http://pyramid_duh.rtfd.org)
