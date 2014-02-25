---
layout: post
title: Battlecode Code Snippets
description: Snippets of source code from the winning bot of 2011. Marvel at the ludicrous java bytecode hacks.
---
**Update** (6 Jan 2014): Cory Li has written a blog post that goes way
in-depth on [java bytecode hacking](http://cory.li/bytecode-hacking/). Very
useful resource; highly recommended!
<hr>

Below are a series of sections on some of our low-level implementation. One of
the main considerations in Battlecode is code performance. Optimizing for
Battlecode is unlike optimizing for real life, because performance is measured
differently. Your algorithm isn't timed based on how fast it runs, but on how
much bytecode it compiles into. This means that if you can do a O(n)
calculation in O(1) bytecode, that can and should be abused heavily.

## Utility functions

As you may know, the devs assign a standard bytecode cost to objects and
functions in `java.util` and other standard java libraries. DON'T USE THEM. It's
way more expensive to use ArrayList than it is to hack your own. ArrayLists
are carefully crafted to be the general solution for any possible way that you
would want to use a list of objects. Are you really going to use all of them?
No. It would be convenient to be able to just use an ArrayList instead of
hacking up your own, but YOU DON'T DESERVE TO BE HAPPY.

### ArrayLists
**Bad:**
{% highlight java %}
ArrayList<RobotInfo> enemies = new ArrayList<RobotInfo>();
{% endhighlight %}
**Our solution:**
{% highlight java %}
RobotInfo[] enemies = new RobotInfo[MAX_ENEMIES];
{% endhighlight %}

Yeah, it doesn't support fancy operations, it doesn't grow dynamically, but
it's fast. We use these everywhere.

### HashSets
We usually made a new hashset-like object for each data type that we needed to
contain. Here is a set of MapLocations

{% highlight java %}
public class FastLocSet {
    private static final int HASH = Math.max(GameConstants.MAP_MAX_WIDTH,
                                             GameConstants.MAP_MAX_HEIGHT);
    private int size = 0;
    private boolean[][] has = new boolean[HASH][HASH];

    public void add(MapLocation loc) {
        int x = loc.x % HASH;
        int y = loc.y % HASH;
        if (!has[x][y]){
            size++;
            has[x][y] = true;
        }
    }

    public void remove(MapLocation loc) {
        int x = loc.x % HASH;
        int y = loc.y % HASH;
        if (has[x][y]){
            size--;
            has[x][y] = false;
        }
    }

    public boolean contains(MapLocation loc) {
        return has[loc.x % HASH][loc.y % HASH];
    }

    public void clear() {
        has = new boolean[HASH][HASH];
        size = 0
    }
}

{% endhighlight %}

You get the drift. But that was a simple example. What if you need a set of
MapLocations and you need to be able to iterate through them? Well, we
discovered that StringBuilder operations were distressingly cheap...

{% highlight java %}
public class FastIterableLocSet {
    private int size = 0;
    private StringBuilder keys = new StringBuilder();

    private String locToStr(MapLocation loc) {
        return "^" + (char)(loc.x) + (char)(loc.y);
    }

    public void add(MapLocation loc) {
        String key = locToStr(loc);
        if (keys.indexOf(key) == -1) {
            keys.append(key);
            size++;
        }
    }

    public void remove(MapLocation loc) {
        String key = locToStr(loc);
        int index;
        if ((index = keys.indexOf(key)) != -1) {
            keys.delete(index, index+3);
            size--;
        }
    }

    public boolean contains(MapLocation loc) {
        return keys.indexOf(locToStr(loc)) != -1;
    }

    public void clear() {
        keys = new StringBuilder();
        size = 0;
    }

    public MapLocation[] getKeys() {
        MapLocation[] locs = new MapLocation[size];
        for (int i = 0; i < size; i++) {
            locs[i] = new MapLocation(keys.charAt(i*3+1), keys.charAt(i*3+2));
        }
        return locs;
    }

    public void replace(String newSet) {
        keys.replace(0, keys.length(), newSet);
        size = newSet.length() / 3;
    }
}
{% endhighlight %}


## InfoCache

We used a utility class called InfoCache to handle a lot of the functions that
we knew we would do every round, like sensing for enemies. We never called
`RobotController.yield()` directly from any unit, instead we had an
`InfoCache.yield()` method that looked vaguely like this:

{% highlight java %}
public void yield() {
    msg.sendMessages();
    this.rc.yield();

    this.postYield();

    if (parseMessages)
        msg.parse();
}
{% endhighlight %}

`this.postYield()` called back into the Unit class, where units would define
specific behavior such as this:

{% highlight java %}
public void postYield() {
    if (state == STATE.ATTACK) {
        try {
            Team t;
            for (Robot r: sc.senseNearbyGameObjects(Robot.class)) {
                if (r.getID() < maxId) {
                    if ((t = r.getTeam()) != InfoCache.myteam && t != Team.NEUTRAL) {
                        RobotInfo ri = sc.senseRobotInfo(r);
                        info.addEnemy(r, ri);
                    }
                }
            }
        } catch (GameActionException e) {
            e.printStackTrace();
        }
    } else {
        try {
            Team t;
            for (Robot r: sc.senseNearbyGameObjects(Robot.class)) {
                if ((t = r.getTeam()) == Team.NEUTRAL) {
                    RobotInfo ri = sc.senseRobotInfo(r);
                    info.addDebris(ri);
                } else if (t != InfoCache.myteam) {
                    RobotInfo ri = sc.senseRobotInfo(r);
                    info.addEnemy(r, ri);
                }
            }
        } catch (GameActionException e) {
            e.printStackTrace();
        }
    }
    considerStateChange();
}
{% endhighlight %}

Putting this code in the Unit allowed us to tailor it specifically to how that
unit would behave. If it was unimportant for it to sense Debris, for example,
we could cut that out. Meanwhile, the `InfoCache.addEnemy()` method looked like
this:

{% highlight java %}
public void addEnemy(Robot r, RobotInfo ri) {
    enemies[numEnemies++] = new FastRobotInfo(ri.location, ri.chassis, roundNum, ri.hitpoints, r);
}
{% endhighlight %}

We used the FastRobotInfo class basically as a wrapper for robot information
that we needed to pass around. Each round we would also reset numEnemies to 0.
So the above loop would stick all the sensed enemies into this enemies[] array
for easy access later. For example, here is our overly-complicated method to
find out who to shoot. We tweaked this a lot to try to make it both optimal and
fast.

{% highlight java %}
/**
* Returns the best target to attack
* @param attackEnemies if 1, will prefer not to turn.
* If 2, will prefer best target in range
* @param turnsToIdle if 0, will prefer not to turn.
* @return best target or null
*/
public FastRobotInfo getBestAttackTarget(int attackEnemies, boolean attackDebris, int turnsToIdle) {
    FastRobotInfo fri = null;
    double minEnergon = Double.MAX_VALUE;
    // Prefer to not turn
    if (turnsToIdle == 0 || attackEnemies == 1) {
        // In range, non radial, lowest energon
        // In range, radial, lowest energon
        // Out of range, radial, lowest energon
        boolean haveTargetInRange = false;
        boolean haveTargetNoTurn = false;
        for (int i = 0; i < numEnemies; i++) {
            FastRobotInfo r = enemies[i];
            if (haveTargetNoTurn && r.energon > minEnergon) {
                continue;
            }
            int dist = (haveTargetNoTurn ? 0 :
            myLoc.distanceSquaredTo(r.location));
            // If in range
            if (dist <= this.wc_min_range) {
                // If no turn
                if (this.minRangeWeapon.withinRange(r.location)) {
                    // If don't have target in range, or no turn, or energon is min
                    if (!haveTargetInRange || !haveTargetNoTurn || r.energon < minEnergon) {
                        fri = r;
                        minEnergon = r.energon;
                        haveTargetNoTurn = true;
                        haveTargetInRange = true;
                    }
                    haveTargetNoTurn = true;
                } // If don't have no turn target
                else if (!haveTargetNoTurn) {
                    // If don't yet have target in range OR energon is min
                    if (!haveTargetInRange || r.energon < minEnergon) {
                        fri = r;
                        minEnergon = r.energon;
                        haveTargetInRange = true;
                    }
                }
            } // If not in range AND don't already have target in range
            else if (!haveTargetInRange && dist <= this.wc_max_range) {
                if (r.energon < minEnergon) {
                    fri = r;
                    minEnergon = r.energon;
                }
            }
        }
        if (haveTargetInRange) {
            fri.lastSeen = -1;
        }
    } // Prefer to turn
    else {
        // In range with lowest energon
        // Out of range with lowest energon
        boolean haveTargetInRange = false;
        for (int i = 0; i < numEnemies; i++) {
            FastRobotInfo r = enemies[i];
            int dist = myLoc.distanceSquaredTo(r.location);
            // If in range
            if(dist <= this.wc_min_range) {
                // If don't have target in range, or energon is min
                if (!haveTargetInRange || r.energon < minEnergon) {
                    fri = r;
                    minEnergon = r.energon;
                    haveTargetInRange = true;
                }
            } // If not in range AND don't already have target in range
            else if (!haveTargetInRange && dist <= this.wc_max_range) {
                if (r.energon < minEnergon) {
                    fri = r;
                    minEnergon = r.energon;
                }
            }
        }    
    }
    
    if (attackDebris && fri == null) {
        // Look for debris in range of all weapons
        for (int i = 0; i < Math.min(numDebris, 5); i++) {
            FastRobotInfo r = debris[i];
            if(this.minRangeWeapon.withinRange(r.location)) {
                if (r.energon < minEnergon) {
                    fri = r;
                    minEnergon = r.energon;
                }
            }
        }
    }
    return fri;
}
{% endhighlight %}


I don't know if this is the best way to select a target to attack. Maybe you
have a much better, faster method. If so, please share it. We learn more as a
whole when we share.

## Messaging

The messaging system that we used in 2011 was built upon the same system that
Eric Marion designed in 2010. We wanted a messaging system that was bytecode
efficient, flexible, and secure. Mr. Marion delivered on all of those. In fact,
he did them all so well that I think it caused us to rely too heavily on
messaging in 2010 and 2011, but that's another debate. The important part is
that this was a pretty awesome way to send messages.

All of the content of any message was put into a single string. The format was as follows:  
`[address][type][content][optional terminator]`

The address was always `^` plus at least one letter. For example, `^A` would be
received by all of our units. `^b` would be received by only
our buildings. `^r22` would be received by only the robot with the id of 22
(which was encoded as a char). I will discuss how the addressing scheme worked
later.

The type was always exactly one letter, and it told the receiver what kind of
information it was receiving. For example, `m` denoted incoming map data, while
`b` was an alert that a new base building had been constructed.

The terminator was only used when the content had variable length, such as a list of enemy robot locations.

Throughout a robot's turn, it could call various "send x type of message"
methods, and the message string would get added to the end of any existing
message strings. The whole message would get sent out at the end of the round.
But how were they read? How did the addressing system work? Well, when a robot
is created it calculates all of the addresses that it will listen for and
stores them in an array called `myAddrs`. Then the messages are read with code
that looked like this:

{% highlight java %}
StringBuilder subs = new StringBuilder();
for (Message m: this.rc.getAllMessages()) {
    subs.append(m.strings[0]);
}
    
// For each of our addresses
for(String addr: myAddrs) {
    // Find all instances of that address in this message
    while((i = subs.indexOf(addr, i)) != -1) {
        processSubmessage(new StringBuilder(subs.substring(i + addr.length())));
        i++;
    }
}
{% endhighlight %}


In the first step, we lump all the strings of all the incoming messages
together into one single StringBuilder. By the way, we found out that
StringBuilder operations were cheaper than String operations. Then, for each
address that the robot responds to, we search the giant lump of messages for
messages addressed to the robot. The search is done with the
`StringBuilder.indexOf()` method. While the index of the address is not -1
(while that address is found in the messages), the loop continues. Inside the
loop, we call `processSubmessage()` on the string that starts just past the
address (so, the `[type][content][terminator]` part of the message). Then, `i` is
incremented to the position just past the position of the address that was just
found, and the search continues from that point.

The brilliance of this method is that `indexOf()` costs some set amount of
bytecode. That means that the bytecode cost to parse messages is not dependent
on the size or amount of messages (length of the string), it only depends on
the number of messages addressed to this particular robot. Eric Marion is one
smart dude.

But wait! How can you send integers and map locations in string format? You've
probably already figured this part out, but I'll mention it anyway because
there's a little tricky bit. To send map locations, you just cast the x and y
values to chars and append them to the message string, then deserialize them
when you take them out. You can do the same thing with integers, but with one
caveat. What if the integer just happens to be the character value for
`^`? Well, since we use `^` in our addressing system, that could cause us to
see this position as the beginning of a message, when it is not. So any time we
add integers we offset it by 0x100. Ex: `stringBuilder.append((char)(myRobotId +
0x100)`). Remember to subtract 0x100 when you take them out.

Okay, now you know how to make a flexible, efficient messaging system. So it's
flexible...it's efficient...oh, what's the third thing? What's the third...

I'm gonna go with EPA?

Sorry Rick, it's security. Since all robots can receive all messages, you will
be getting some of your opponent's messages and they will be getting some of
yours. What happens if they replay them? What happens if they mutate them and
replay them? Not many teams will have time to try things like that, but you
don't want to choke if they do. So we implement a hashing scheme. In 2009,
`Arrays.hashCode()` cost a set amount of bytecode regardless of the length of the
array, so many teams used that as their hashing algorithm. Incidentally, Greg
Little of the team Little also noticed this and saw opportunity. Since it was
such a cheap and readily available hashing algorithm, he figured that a lot of
teams would use it. So he looked up the OpenJDK implementation of
`Arrays.hashCode()` and made a short method that would mutate the contents of an
array without mutating the hash. Then he mutated enemy messages and replayed
them. That. Is. Badass.

We had heard about Little's messaging attacks in 2009, so we knew that we
should make our hashing algorithm a bit less readily guessable. So before we
send the string, we reverse it and store the hashcode in the integer array of
the message. Reversing it and calling `hashCode()` are both constant-bytecode
operations. Why reverse it? Because there's an off-chance that another team
will look up the OpenJDK implementation of `String.hashCode()` and be able to
mangle our messages (or the messages of any team that sends Strings). It's less
likely that they will think to try reversing it before mangling. We also added
a number to the hash that was dependent on whether we were team A or team B so
that if we played a version of ourselves in testing, the other team's messages
would fail to validate the hash and we wouldn't get weird messaging crossover.
Naturally, this changes the parsing code a bit, so let's look at the updated
model:

{% highlight java %}
for (Message m: this.rc.getAllMessages()) {
    // Check message format
    if (m.ints != null && m.ints.length == 1 && m.strings != null && m.strings.length == 1) {
        String s = m.strings[0];

        // Check message hash
        if (m.ints[0] == new StringBuilder(s).reverse().toString().hashCode() + getTeam().ordinal()) {
            subs.append(s);
        }
    }
}
{% endhighlight %}


First we make sure that the message format looks like one of ours (only has one
String and one int), then we check the hash. It's worth noting that this is
still vulnerable to straight-up replay attacks, so you should also add a Time
To Live to the message. It's not pictured here, but we encode the round number
as the first character in the string and check the age of the message with the
hash. If it's too old, we discard it.

By the way, any time I say "we" in this particular document, I mean "Eric
Marion". He was the one that came up with all of this. Also, I encourage you
all to talk with each other about messaging strategies, but for the love of god
do not EVER tell another team what your hashing strategy is. All of this
security is based on obscurity. If another team knows how you process messages,
they can trivially hijack your communication network.

One final note on messaging attacks: Greg Little's approach was the most
sophisticated that we had heard of, but there are other methods. You can send
messages with nulls in the arrays, or where the arrays are null themselves to
try to get the opposing player to throw an exception. You can try to detect the
enemy message format and reproduce it, only muuuuuuch longer. If their
validation isn't constant-time with the length of the message, it forces them
to spend way too much bytecode to parse it and they might skip turns.
Honestly, most of the good teams will make sure they aren't susceptible to
these attacks. We took the viewpoint that any team we could beat with messaging
attacks we could probably have beaten without messaging attacks. That said,
team blacksheep got knocked out in the seeding tournament in 2010 because their
player froze when it tried to read enemy messages. They were using
`Arrays.hashCode()` for verification because it had been constant-bytecode in
2009, but hadn't checked to make sure that it still was in 2010. It wasn't.
Their player skipped so many turns reading messages that it stopped moving. For
reference, blacksheep placed 2nd that year (well ahead of us), so these
mistakes can happen to the best of us. If you're clever and have the time, try
playing around with messaging attacks. They're pretty fun.

## Map

It is always good to have information about terrain. Terrain is key. The devs
help a little bit by making `RobotController.senseTerrainTile()` cache the
result. If you have ever sensed a terrain tile while it was in range, you can
sense that same tile from anywhere and get the same result. Take note. That's
useful. But you need more.

### Edges
You need to know the size of the map. Ideally you will probably want to change
your strategy based on the map size. In 2010, spread-out construction
strategies dominated on large maps, and aggressive fighting strategies
dominated on small and mid-sized maps. Our player started by being aggressive,
and then switching once it determined that the map was large. So store the 4
edges of the map. If you don't know them yet, guess. But make sure that you
know it's a guess. You can use these later for things like search patterns, or
finding the enemy base. If you make note of your starting base location, you
can obtain the enemy base location by simply reflecting it over the origin.
Also, I recommend using your messaging system to propagate this knowledge
around your robots. Sending 4 MapLocations every 10-20 rounds is cheap and
easy, and totally worth it.

I saw another excellent use of edge knowledge in 2010, when Archons were still
around. Some matches turned into two large armies fighting. Team A would get
the upper hand and team B would start retreating. Trouble is, it's really hard
to stop retreating once you start. Also, it's hard to chase down Archons since
they're relatively fast and can fly. So you would get team A chasing team B all
over the map for a ridiculous amount of time. Sometimes it was just silly, but
sometimes it would mean that team A would lose because while they were trying
to chase down team B's fleeing Archons, team B secretly had some dudes
elsewhere gathering points. So team My Archon Died BellmanFording the Stream
wrote special-case code that would detect if they were chasing a retreating
enemy (they almost always were), and detect if they were about to run that
enemy into a wall. Then they would anticipate which direction the enemy would
turn, and head them off. They only ended up using it once or twice, but it was
*beautiful*.

### Points of Interest
Obviously, you should store interesting points. Your base location. Mine
locations. Whatever else you like I've got nothing useful for you here. If you
decide to try to send these lists via messaging, keep in mind that processing
long lists takes a lot of bytecode. Be careful. One thing that I always wanted
to do is store locations of enemies with the round last seen, estimated
strength, and value of destruction. Sadly, it was easier to store this
information than to use it. We did a bit of this in 2010. Since Teleportation
Towers could sense the locations of all of your other Teleportation Towers, we
only built them instead of other types of towers. Then, if any of the towers
sensed that a tower disappeared, we knew that there was an enemy near where it
disappeared. We made some good use of that, but team blacksheep used it in a
far more interesting way. Oh, and they also used the teleportation ability. We
just used them for their global sensing ability.

### Miscellaneous
This isn't really mapping, per se, but it's similar. Say you want to use your
Jump component to teleport forwards. Well, you should sense the tile first to
make sure it's free. What if it isn't? Which one do you try next? In these
situations, the fastest method is to just hard-code in a priority order of
locations to try. Like this:

{% highlight java %}
{% raw %}
private static final int[][][] jumpLocs = {
    // NORTH
    {{0, -4}, {-1, -3}, {0, -3}, {1, -3}, {-2, -3}, {2, -3}},
    // NORTH_EAST
    {{2, -3}, {3, -2}, {1, -3}, {2, -2}, {3, -1}, {0, -4}, {4, 0}},
    // EAST
    {{4, 0}, {3, -1}, {3, 0}, {3, 1}, {3, -2}, {3, 2}},
    // SOUTH_EAST
    {{2, 3}, {3, 2}, {1, 3}, {2, 2}, {3, 1}, {0, 4}, {4, 0}},
    // SOUTH
    {{0, 4}, {-1, 3}, {0, 3}, {1, 3}, {-2, 3}, {2, 3}},
    // SOUTH_WEST
    {{-2, 3}, {-3, 2}, {-1, 3}, {-2, 2}, {-3, 1}, {0, 4}, {-4, 0}}, 
    // WEST
    {{-4, 0}, {-3, -1}, {-3, 0}, {-3, 1}, {-3, -2}, {-3, 2}},
    // NORTH_WEST
    {{-2, -3}, {-3, -2}, {-1, -3}, {-2, -2}, {-3, -1}, {0, -4}, {-4, 0}},
};
{% endraw %}
{% endhighlight %}

Each of those pairs of numbers is an (x,y) offset from your current location. Each row of those pairs is the list of relative locations to check for a given facing, in priority order. So how do you use this list? Like so:

{% highlight java %}
public static MapLocation getJumpLoc(MapLocation fromLoc, Direction dir) {
    MapLocation tryLoc;
    for (int[] points: jumpLocs[dir.ordinal()]) {
        tryLoc = new MapLocation(fromLoc.x + points[0], fromLoc.y + points[1]);
        if (canJump(tryLoc)) {
            return tryLoc;
        }
    }
    return null;
}
{% endhighlight %}


Index into the array with dir.ordinal() to get the priority list of locations.
Then calculate the absolute MapLocation using the offsets, and try to jump to
that location. This code looks nasty and you need to be *very careful* and use
*extensive* comments to avoid bugs, but it's fast. In 2010 I had a
400 line method of extremely repetitive code to determine optimal building
placement. It sucked to write, but it was super fast and produced some of the
best concave hulls in the tournament.

## Pathfinder

The pathfinder that we used in 2011 was built on top of my efforts from 2010.
The idea was to use a bug algorithm and allow for lookahead calculations. While
I did program the lookahead tangent bugger, we ended up not using it at all.
Our pathfinder was just a straight-up bug algorithm. That makes it sound
simple. Maybe other teams had less trouble than us; maybe I was just foolishly
overcomplicating things, but pathfinding was always extremely difficult for us.
Here is most of the core code for determining which direction a robot should
go.

{% highlight java %}
public Direction getNextMove(){
    Direction desiredDir = InfoCache.myLoc.directionTo(target);
    if (desiredDir == Direction.NONE || desiredDir == Direction.OMNI)
        return desiredDir;
    // If we are bugging around an object, see if we have gotten past it
    if (state == STATE.BUGGING){
        // If we are closer to the target than when we started, and we can
        // move in the ideal direction, then we are past the object
        if (InfoCache.myLoc.distanceSquaredTo(target) < startLoc.distanceSquaredTo(target) && canMove(desiredDir)){
            state = STATE.FLOCKING;
        }
    }

    switch(state){
    case FLOCKING:
        Direction newDir = flockInDir(desiredDir);
        if (newDir != null)
            return newDir;

        state = STATE.BUGGING;
        startLoc = InfoCache.myLoc;
        startDesiredDir = desiredDir;
{% endhighlight %}


This isn't it, but let's take a break for a second. If the state is `FLOCKING`
(moving without bugging around an object), we try to move in this direction
obtained from `flockInDir()`. If that fails, then we set our state to start
bugging around the object.

{% highlight java %}
private Direction flockInDir(Direction desiredDir){
    Direction[] directions = new Direction[3];
    directions[0] = desiredDir;
    Direction left = desiredDir.rotateLeft();
    Direction right = desiredDir.rotateRight();
    boolean leftIsBetter = (InfoCache.myLoc.add(left).distanceSquaredTo(target) < InfoCache.myLoc.add(right).distanceSquaredTo(target));
    directions[1] = (leftIsBetter ? left : right);
    directions[2] = (leftIsBetter ? right : left);


    for (int i = 0; i < directions.length; i++){
        if (canMove(directions[i])){
            return directions[i];
        }
    }
    return null;
}
{% endhighlight %}

What this does, is take the three directions closest to your ideal direction,
order them in priority order, and check to see if you can move in any of those
directions. If so, you return that direction and continue on your merry way. If
not, we proceed to the next part of the `getNextMove()` function.


{% highlight java %}
switch(state) {
    case FLOCKING:
        Direction newDir = flockInDir(desiredDir);
        if (newDir != null)
            return newDir;


        state = STATE.BUGGING;
        startLoc = InfoCache.myLoc;
        startDesiredDir = desiredDir;
        // intentional fallthrough
    case BUGGING:
        Direction moveDir = hug(desiredDir, false);
        if (moveDir == null) {
            moveDir = desiredDir;
        }
        return moveDir;
}
{% endhighlight %}

Okay, so it appears that all the bug behavior is done in `hug()`. Let's take a
look at that.

{% highlight java %}
private Direction turn(Direction dir){
    return (hugLeft ? dir.rotateRight() : dir.rotateLeft());
}

private Direction hug (Direction desiredDir, boolean recursed) {
    if (canMove(desiredDir)) {
        return desiredDir;
    }


    Direction tryDir = turn(desiredDir);
    MapLocation tryLoc = InfoCache.myLoc.add(tryDir);
    for (int i = 0; i < 8 && !canMove(tryDir) && !Map.isOffMap(tryLoc); i++) {
        tryDir = turn(tryDir);
        tryLoc = InfoCache.myLoc.add(tryDir);
    }
    // If the loop failed (found no directions or encountered the map edge)
    if (!canMove(tryDir) || Map.isOffMap(tryLoc)) {
        hugLeft = !hugLeft;
        if (recursed) {
            // We've tried hugging in both directions...
            if (myProhibitedDirs[0] != NO_DIRS && myProhibitedDirs[1] != NO_DIRS) {
                // We were prohibiting certain directions before.
                // try again allowing those directions
                myProhibitedDirs[1] = NO_DIRS;
                return hug(desiredDir, false);
            } else {
                // Complete failure. Reset the state and start over.
                reset();
                return null;
            }
        }
        // mark "recursed" as true and try hugging the other direction
        return hug(desiredDir, true);
    }
    // If we're moving in a new cardinal direction, store it.
    if (tryDir != InfoCache.myDir && !tryDir.isDiagonal()) {
        if (turn(turn(DIRECTIONS[myProhibitedDirs[0]])) == tryDir) {
            myProhibitedDirs[0] = tryDir.opposite().ordinal();
            myProhibitedDirs[1] = NO_DIRS;
        } else {
            myProhibitedDirs[1] = myProhibitedDirs[0];
            myProhibitedDirs[0] = tryDir.opposite().ordinal();
        }
    }
    return tryDir;
}
{% endhighlight %}

Okay, makes sense. But what's that stuff with `myProhibitedDirs` at the end?
Okay, well to make sure that we don't end up retracing our steps, we store the
past 2 directions we have come from and make sure we don't go in those
directions. `myProhibitedDirs` is an int array of length 2, and stores two
direction ordinals. The way it is used is in the `canMove()` function.

{% highlight java %}
private boolean canMove(Direction dir) {
    if (BLOCK_DIRS[myProhibitedDirs[0]][myProhibitedDirs[1]][dir.ordinal()]) {
        return false;
    }


    if (this.mc.canMove(dir)) {
        return true;
    }
    return false;
}
{% endhighlight %}

Okay, so what's going on here? Well, `BLOCK_DIRS` is a `boolean[][][]` array
that is initialized in the constructor. Essentially, it's a lookup table that
allows us to very quickly say, "Given that I was moving from direction
`myProhibitedDirs[1]`, and then from direction `myProhibitedDirs[0]`, should I
block movement in direction dir?" The boolean value in the array is the answer
to that question. Here is how we calculate `BLOCK_DIRS`. Remember, a value of
true means that we will not allow movement in that direction.

{% highlight java %}
for (Direction d: Direction.values()) {
    if (d == Direction.NONE || d == Direction.OMNI || d.isDiagonal())
        continue;
    for (Direction b: Direction.values()) {
        // Blocking a dir that is the first prohibited dir, or one
        // rotation to the side
        BLOCK_DIRS[d.ordinal()][b.ordinal()][d.ordinal()] = true;
        BLOCK_DIRS[d.ordinal()][b.ordinal()][d.rotateLeft().ordinal()] = true;
        BLOCK_DIRS[d.ordinal()][b.ordinal()][d.rotateRight().ordinal()] = true;
        // b is diagonal, ignore it
        if (!b.isDiagonal() && b != Direction.NONE && b != Direction.OMNI) {
            // Blocking a dir that is the second prohibited dir, or one
            // rotation to the side
            BLOCK_DIRS[d.ordinal()][b.ordinal()][b.ordinal()] = true;
            BLOCK_DIRS[d.ordinal()][b.ordinal()][b.rotateLeft().ordinal()] = true;
            BLOCK_DIRS[d.ordinal()][b.ordinal()][b.rotateRight().ordinal()] = true;
        }
    }
}
{% endhighlight %}


So looking back at `canMove()`, it makes sense. If we are trying to move in a
direction that is adjacent to either of our previous two travel directions, we
don't allow that. Okay, there's one more piece to this that I need to add. What
happens if you start off with your goal North of you, then you bug around to
the point where the goal is South? Because of the way that we're storing
previous directions, that can actually cause problems. So we use a variable
called goneAround to track if you've managed to go around the target or not.
This is the final addition to `getNextMove()`:

{% highlight java %}
public Direction getNextMove() {
    Direction desiredDir = InfoCache.myLoc.directionTo(target);
    if (desiredDir == Direction.NONE || desiredDir == Direction.OMNI)
        return desiredDir;
    // If we are bugging around an object, see if we have gotten past it
    if (state == STATE.BUGGING) {
        // If we are closer to the target than when we started, and we can
        // move in the ideal direction, then we are past the object
        if (InfoCache.myLoc.distanceSquaredTo(target) < startLoc.distanceSquaredTo(target) && canMove(desiredDir)) {
            myProhibitedDirs = new int[] {NO_DIRS, NO_DIRS};
            goneAround = false;
            state = STATE.FLOCKING;
        }
    }


    switch(state) {
        case FLOCKING:
            Direction newDir = flockInDir(desiredDir);
            if (newDir != null)
                return newDir;


            state = STATE.BUGGING;
            startLoc = InfoCache.myLoc;
            startDesiredDir = desiredDir;
            // intentional fallthrough
        case BUGGING:
            if (goneAround && (desiredDir == startDesiredDir.rotateLeft().rotateLeft() ||
               desiredDir == startDesiredDir.rotateRight().rotateRight())) {
                myProhibitedDirs[0] = NO_DIRS;
            }
            if (desiredDir == startDesiredDir.opposite()) {
                myProhibitedDirs[0] = NO_DIRS;
                goneAround = true;
            }
            Direction moveDir = hug(desiredDir, false);
            if (moveDir == null) {
                moveDir = desiredDir;
            }
            return moveDir;
    }
}
{% endhighlight %}

There were a few more minor additions that we made (flags to disable bugging,
behavior for flying units, etc), but that is the majority of the actual bugging
algorithm. I hope you can get it to work better than we did.

## Navigation

Okay, we just talked bugging, but bugging is just an algorithm, it doesn't
really handle the complicated stuff. So we wrapped our `Bugger` class inside of a
`Navigator` class. The main difference is that `Bugger` only gives you the
direction that you should move to reach your stated goal. Navigator uses Bugger
to find out where it should go next, then accounts for the need to spawn units,
jump, attack, and everything else. Then it makes a decision on what to actually
do. Since things like attacking are inherently tied in to movement, it makes a
lot of sense to put them together.

{% highlight java %}
public boolean move() {
    // Check for the edges of the map once after every step.
    if (needSense && (senseEdges)) {
        senseEdges();
        needSense = false;
    }
    // Try to attack
    int turnsSinceAttack = InfoCache.roundNum - lastTurnAttacked;
    Direction attackDir = Direction.NONE;
    int minTurnsToIdle = Integer.MAX_VALUE;
    int rnds;
    for (WeaponController wc: this.wc) {
        if ((rnds = wc.roundsUntilIdle()) < minTurnsToIdle)
            minTurnsToIdle = rnds;
    }
    FastRobotInfo target;
    target = info.getBestAttackTarget(minTurnsToIdle);
    if (target != null minTurnsToIdle <= 1)) {
        attackDir = attackBestEnemy(minTurnsToIdle, target);
        // OMNI means we attacked successfully
        if (attackDir == Direction.OMNI){
            lastTurnAttacked = InfoCache.roundNum;
            attackDir = Direction.NONE;
        }
        // Otherwise, the enemy is in the direction attackDir
        if (attackDir != Direction.NONE) {
            // If already facing the enemy, wait to move until we attack
            if (InfoCache.myDir == attackDir) {
                // Allow 1 turn between attacks to turn
                if (turnsSinceAttack > 1)
                    return false;
            }
        }
    }
    if (!this.mc.isActive()) {
        // If we need to turn to attack, make the turn
        if (attackDir != Direction.NONE && turnsSinceAttack > 1) {
            this.mc.setDirection(attackDir);
            return false;
        }
        if (InfoCache.myLoc.distanceSquaredTo(target) <= tolerance) {
            return true;
        }
        Direction desiredDir = bug.getNextMove();
        if (desiredDir != Direction.NONE && desiredDir != Direction.OMNI) {
            Direction faceDir = (moveBackwards ? desiredDir.opposite() : desiredDir);
            // Set the direction or move
            if (InfoCache.myDir != faceDir) {
                this.mc.setDirection(faceDir);
            } else if (this.mc.canMove(desiredDir)){
                if (moveBackwards)
                    this.mc.moveBackward();
                else
                    this.mc.moveForward();
                needSense = true;
            }
        }
    }
    return false;
}
{% endhighlight %}

This handles attacking, moving, and sensing. You will notice that even though I
mentioned it, there isn't any code for spawning (*so* two years ago) or jumping.
I left out the jump code because it was very...obfuscated. And I wanted to have
this section of relatively clean-looking code. I will include the jump code and
some more of the attacking code below, but I'm not going to try to walk you
through it. Abandon all hope ye who read here.

{% highlight java %}
/**
* Attack the best enemy
* @return The Direction to face. OMNI if you made an attack,
* NONE if you should ignore it and move normally.
*/
private Direction attackBestEnemy(int minTurnsToIdle, FastRobotInfo target) {
    try {
        if (this.maxRangeWeapon.withinRange(target.location) && minTurnsToIdle == 0) {
            for (WeaponController wc: this.wc) {
                if(!wc.isActive() && (target.lastSeen == -1 || wc.withinRange(target.location))) {
                    wc.attackSquare(target.location, target.chassis.level);
                }
            }
            return Direction.OMNI;
        }
        else {
            return InfoCache.myLoc.directionTo(target.location);
        }
    } catch (Exception e) {
        e.printStackTrace();
    }
    return Direction.NONE;
}


/**
*
* @param dir
* @return 0 - carry on, 1 - found location but can't jump yet, 2 - jumped
*/
private int tryJump(Direction dir, boolean force) {
    if (!force && InfoCache.myLoc.distanceSquaredTo(lastLocTryJump) < 9) {
        return -1;
    }
    if (InfoCache.myDir != dir) {
        if (!this.mc.isActive()) {
            try {
                this.mc.setDirection(dir);
                return 1;
            } catch (GameActionException e) {
                e.printStackTrace();
            }
        }
        return 1;
    }
    MapLocation jumpLoc = null;
    if (bug.state == STATE.BUGGING && force) {
        if (bug.hugLeft) {
            jumpLoc = Map.getJumpLocHugLeft(dir);
        } else {
            jumpLoc = Map.getJumpLocHugRight(dir);
        }
    } else {
        jumpLoc = Map.getJumpLoc(dir);
    }
    if (jumpLoc == null) {
        return 0;
    }
    for (JumpController c: this.jc) {
        if (!c.isActive()) {
            try {
                c.jump(jumpLoc);
                return 2;
            } catch (GameActionException e) {
                e.printStackTrace();
            }
            break;
        }
    }
    return 1;
}


public boolean move() {
    // Check for the edges of the map once after every step.
    if (needSense && (senseEdges)) {
        senseEdges();
        needSense = false;
    }
    // Try to attack
    int turnsSinceAttack = InfoCache.roundNum - lastTurnAttacked;
    Direction attackDir = Direction.NONE;
    int minTurnsToIdle = Integer.MAX_VALUE;
    int rnds;
    for (WeaponController wc: this.wc) {
        if ((rnds = wc.roundsUntilIdle()) < minTurnsToIdle)
            minTurnsToIdle = rnds;
    }
    FastRobotInfo target;
    target = info.getBestAttackTarget(minTurnsToIdle);
    if (target != null minTurnsToIdle <= 1)) {
        attackDir = attackBestEnemy(minTurnsToIdle, target);
        // OMNI means we attacked successfully
        if (attackDir == Direction.OMNI){
            lastTurnAttacked = InfoCache.roundNum;
            attackDir = Direction.NONE;
        }
        // Otherwise, the enemy is in the direction attackDir
        if (attackDir != Direction.NONE) {
            // If already facing the enemy, wait to move until we attack
            if (InfoCache.myDir == attackDir) {
                // Allow 1 turn between attacks to turn
                if (turnsSinceAttack > 1)
                    return false;
            }
        }
    }
    int jumpResult = -1;
    // Don't jump while bugging. It's dangerous.
    if (bug.state != STATE.BUGGING) {
        jumpResult = tryJump(target);
        if (jumpResult == 2) {
            resetBugger();
            return false;
        }
    }
    if (jumpResult == 0)
        lastLocTryJump = InfoCache.myLoc;
    if (!this.mc.isActive()) {
        // If we need to turn to attack, make the turn
        if (attackDir != Direction.NONE && turnsSinceAttack > 1) {
            this.mc.setDirection(attackDir);
            return false;
        }
        if (InfoCache.myLoc.distanceSquaredTo(target) <= tolerance) {
            return true;
        }
        Direction desiredDir = bug.getNextMove();
        // jumpResult must be 0 or -1 at this point
        if (bug.state == STATE.BUGGING) {
            Direction idealDir = InfoCache.myLoc.directionTo(target);
            if (!Bugger.BLOCK_DIRS[bug.myProhibitedDirs[0]][bug.myProhibitedDirs[1]][idealDir.ordinal()]) {
                jumpResult = tryJump(idealDir);
                if (jumpResult == 0)
                    lastLocTryJump = InfoCache.myLoc;
                else if (jumpResult == 1)
                    return false;
            }
            if (jumpResult <= 0) {
                jumpResult = tryJump(desiredDir, true);
            }
            if (jumpResult == 2 || this.mc.isActive())
                return false;
        }
        if (desiredDir != Direction.NONE && desiredDir != Direction.OMNI) {
            Direction faceDir = (moveBackwards ? desiredDir.opposite() : desiredDir);
            // Set the direction or move
            if (InfoCache.myDir != faceDir) {
                this.mc.setDirection(faceDir);
            } else if (this.mc.canMove(desiredDir)){
                if (moveBackwards)
                    this.mc.moveBackward();
                else
                    this.mc.moveForward();
                needSense = true;
            }
        }
    }
    return false;
}
{% endhighlight %}


I'll make a quick note here that we had an additional, higher-level set of
navigation code. The Navigator here is designed to take a location as input and
get you there while spawning, jumping, and attacking appropriately. How do you
determine what that input should be? So there was a bunch of other code
defining our exploration and search behavior. Unfortunately, I don't know
anything about it because Jelle wrote it all ¯\\_(ツ)_/¯
