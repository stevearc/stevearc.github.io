---
layout: post
title: DQL - A Query Language for DynamoDB
description: An interactive commandline interface for querying DynamoDB using a SQL-like language.
---
One of the main pain-points of DynamoDB is the lack of a CLI. When I manage
PostgreSQL, MySQL, Redis, or any other database, I'm frequently dropping into a
terminal to do quick little tasks. It's useful to be able to quickly look up a
user record, count the number of items matching a criterion, or run a short
script to update some values. Since Dynamo only has the API, I ended up trying
to do these things with boto. Let's see what that looked like.

#### Looking up a user record:
{% highlight python %}
import boto
from pprint import pprint

conn = boto.dynamodb2.connect_to_region('us-west-1')
table = Table('users', connection=conn)
result = table.batch_get(keys=[{'userid': 'dsa'}])
pprint(dict(list(result)[0]))

{% endhighlight %}

#### Count number of users with a last name starting with 'A':
{% highlight python %}
import boto

conn = boto.dynamodb2.connect_to_region('us-west-1')
table = Table('users', connection=conn)
count = table.query_count(lastname__beginswith='A', index='name-index')
print count

{% endhighlight %}

And finally, to make you cringe
#### Update a value:
{% highlight python %}
import boto
from pprint import pprint

conn = boto.dynamodb2.connect_to_region('us-west-1')
key = {
    'userid': {
        'S': 'dsa'
    }
}
data = {
    'Action': 'ADD',
    'Value': {
        'N': '1',
    },
}
result = conn.update_item('users', key, data, return_values='ALL_NEW')
pprint(dict(list(result)[0]))

{% endhighlight %}

And you have to write these *every time* you want to run anything on Dynamo.
The added overhead is quite annoying after a while, especially with the
frequent pauses to look up boto documentation.

Now I'm not a huge fan of SQL, but it gets the job done and it's familiar to
DBAs.  So I decided to write a little mini-language for Dynamo that looked
SQL-ish.  Here's the result.

#### Looking up a user record:
{% highlight sql %}
us-west-1> SELECT * FROM users WHERE KEYS IN ('dsa');
{% endhighlight %}

#### Count number of users with a last name starting with 'A':
{% highlight sql %}
us-west-1> COUNT users WHERE lastname BEGINS WITH 'A';
{% endhighlight %}

#### Update a value:
{% highlight sql %}
us-west-1> UPDATE users SET followers += 1 WHERE KEYS IN ('dsa') RETURNS ALL NEW;
{% endhighlight %}

And since it's a CLI, there's inline help:

{% highlight sql %}
local> help select

    Select items from a table by querying an index

    SELECT
        [ CONSISTENT ]
        attributes
        FROM tablename
        WHERE expression
        [ USING index ]
        [ LIMIT limit ]
        [ ASC | DESC ]

    Examples:
        SELECT * FROM foobars WHERE foo = 'bar';
        SELECT CONSISTENT * foobars WHERE foo = 'bar' AND baz >= 3;
        SELECT foo, bar FROM foobars WHERE id = 'a' AND ts < 100 USING 'ts-index';
        SELECT * FROM foobars WHERE foo = 'bar' AND baz >= 3 LIMIT 50 DESC;
{% endhighlight %}

Feedback welcome. If you'd like to request features or file bugs, [do so on
github](http://github.com/mathcamp/dql/issues).

Code: [github.com/mathcamp/dql](http://github.com/mathcamp/dql)  
Docs: [dql.rtfd.org](http://dql.rtfd.org)
