---
layout: post
title: Flywheel - a DynamoDB ORM
description: Flywheel is a Python ORM for DynamoDB. It's heavily influenced by SQLAlchemy, and makes working with Dynamo much easier!
---
I lied. It's not an ORM. But if you squint, it looks like one.

DynamoDB is pretty great, but it has the same problem that *all* Amazon
services have: a **horrible** API. No offense, AZ, I love your services. They
just need a fresh coat of paint. Maybe a paper bag.

If you use Python and AWS, you have used
[boto](http://boto.readthedocs.org/en/latest/). Boto does a wonderful job of
abstracting away nightmare-inducing SOAP requests into normal function calls.
That's great, but you usually want another abstraction layer in between boto
and your application code. Boto deals with primitive data types and hits the
raw API. Ideally your database code will:

* Use objects instead of dicts
* Have a simple and familiar query syntax
* Make simple operations easy

## A Challenger Appears

So I wrote a library for DynamoDB that looks as much as possible like
[SQLAlchemy](http://www.sqlalchemy.org/), and I open-sourced it.

Code: [github.com/mathcamp/flywheel](http://github.com/mathcamp/flywheel)  
Docs: [flywheel.rtfd.org](http://flywheel.readthedocs.org)  
Install: `pip install flywheel`

This is what a basic model looks like (schema taken from this [DynamoDB API
documentation](http://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html))

{% highlight python %}

from datetime import datetime
from flywheel import Model, Field, GlobalIndex

class GameScore(Model):
    __metadata__ = {
        'global_indexes': [
            GlobalIndex('GameTitleIndex', 'title', 'top_score')
        ],
    }
    userid = Field(hash_key=True)
    title = Field(range_key=True)
    top_score = Field(data_type=int)
    top_score_time = Field(data_type=datetime)
    wins = Field(data_type=int)
    losses = Field(data_type=int)

    def __init__(self, title, userid):
        self.title = title
        self.userid = userid

{% endhighlight %}

Create a new top score:

{% highlight python %}

>>> score = GameScore('Master Blaster', 'abc')
>>> score.top_score = 9001
>>> score.top_score_time = datetime.utcnow()
>>> engine.sync(score)

{% endhighlight %}

Get all top scores for a user:

{% highlight python %}
>>> scores = engine.query(GameScore).filter(userid='abc').all()
{% endhighlight %}

Get the top score for Galaxy Invaders:

{% highlight python %}

>>> top_score = engine.query(GameScore).filter(title='Galaxy Invaders')\
...     .first(desc=True)

{% endhighlight %}

Atomically increment a user's "wins" count on Alien Adventure:

{% highlight python %}
>>> score = GameScore('Alien Adventure', 'abc')
>>> score.incr_(wins=1)
>>> engine.sync(score)
{% endhighlight %}

Get all scores on Comet Quest that are over 9000:

{% highlight python %}
>>> scores = engine.query(GameScore).filter(GameScore.top_score > 9000,
...                                         title='Comet Quest').all()
{% endhighlight %}


This is just a brief overview of what Flywheel looks like. If you want to know
everything it's capable of, you can find in-depth information [in the
docs](http://flywheel.rtfd.org).
