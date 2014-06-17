---
layout: post
title: Battlecode Postmortem 2011
description: A look back at the Battlecode competition. What went right, what went wrong, and how we won in 2011
---

## Hey Guys
I decided that I wanted to write up a postmortem for my 2011 battlecode
experience. Here is the list of the teams I was on:

* 2009: **HeyGuys** (top 16) (Andrew Westerdale 2009, Erik Chen 2011, Eric
  Marion 2011, Steven Arcangeli 2011)  
* 2010: **boydboyd** (4th place) (Erik Chen 2011, Eric Marion 2011, Steven
  Arcangeli 2011)  
* 2011: **gunface** (1st place) (Steven Arcangeli 2011, Adrian Mullings 2011,
  Ethan Sterling 2010, Jelle van den Hoof 2013)

2011 was the third year that I participated in the battlecode competition, and
I frequently found myself falling into design patterns that I had seen as early
as my first year. Across the three years there was a lot of code-incest and
framework-incest that was at times helpful and at times really limiting. I
found myself wondering how other teams were implementing everything from
strategy controls to their navigation algorithms. I could ask, but competition
can be pretty intense and teams will tend to hoard "trade secrets". I know that
we are guilty of that in several regards as well. I would also like to give a
brief shout-out to Steve Bartel and Spenser Skates of My Archon Died
BellmanFording the Stream, the 2010 winner, and also g2g ice skating lessons,
the 2009 winner. They were always the epitome of friendly and helpful. They
were comfortable discussing any aspects of strategy, the metagame, or even
their own implementation of specific behaviors. I would say that this
postmortem is partially inspired by them. It's also partially inspired by my
unhealthy addiction to battlecode.

## Competition Rules

The premise of the 2011 game was not so different from previous years. There
were "flux mines" located all over the map, and you had to mine these "flux
mines" to gain...flux. You could then spend flux on robots and components.
Components? Yes! Components! The units in 2011 were completely customizable.
There were 5 types of chassis (light, medium, heavy, flying, and building) and
a long list of components that you could add on to the chassis. Each component
took up some amount of weight on the chassis, in order to limit how much a
single robot could carry. Heavy chassis had more health and could carry more
components than light chassis, but were slower. But let's get back to flux.

You mine flux by putting a building on top of a flux mine and equipping it with
a recycler (a component; listed below), at which point it adds some amount of
flux to your flux reserve every turn. Note that this is a global flux reserve,
not on a per-building basis. Building a chassis or a component cost some set
amount of flux, but in addition each chassis consumed some amount of flux per
round, thus limiting how large of an army you could support. The more mines you
controlled, the larger the army. If you suddenly found yourself with more
robots than you can support, they would start turning off. A turned-off robot
is exactly what it sounds like. It didn't move, act, or execute any code. The
upside is that a nearby friendly unit could turn it back on when you can
support it again, and it would continue on it's merry way. 

The win condition this year was solely based on wiping out the other team. If
you killed the other team, you won. Otherwise, the game would go to whoever had
the highest rate of flux income when the time ran out.

So, abstractly, it became a game of territory control. You need more territory
so you can have more mines so you can support a larger army, but then your army
has to defend all of that territory because if your opponent starts destroying
your mines, your army will start turning off. I think it was a great premise
and a lot of the implementation was done very well. 

Below is a summary of some of the key components.

* **Recycler** - You build this on buildings. If on top of a mine, it mines the
  flux. It also can build the light chassis and some simple components.
* **Armory** - You build this on buildings. It can build light, medium, and
  flying chassis as well as some more advanced components, like Jump.
* **Factory** - You build this on buildings. It can build light, medium, and
  heavy chassis as well as some more advanced components, like Railgun.
* **Constructor** - This component can build Building chassis and the Recycler,
  Armory, and Factory components. It's usually put on a worker unit of some
  sort.

* **Jump** - Allows the unit to teleport ~4 squares of distance with a cooldown
  of 20 rounds.
* **Dummy** - The dummy component allows to spawn a dummy robot (an empty
  medium chassis) every x rounds. The dummy robot is just a decoy to draw fire.

* **Vision components** - There were a variety of components that let your
  robots sense surrounding territory and units. They generally traded off range
  for weight. Satellites and Telescopes could, in addition, sense the
  components on enemy robots.
* **Messaging components** - Much the same as the vision components. These were
  required to send messages, but not to receive them. Heavier components had
  greater range.
* **Weapon components** - They varied by weight, range, damage, and cooldown.
  Certain ones were better against certain types of defense components in
  certain situations.
* **Defense components** - They varied by how they defended you. Again, certain
  components worked better against certain weapons.

## Lessons from years past
Here's something very important, so pay attention. CODE THE FRAMEWORK FIRST. Here's what not to do:

"Oh, hey! This particular weapon is really strong if used in this particular
way! I'll just write some code to outfit some units with this weapon and then
write some code for them to use the weapon properly. Now I have the best units
and I'm kicking everyone's ass on the scrimmage server! I'm the best!"

Now the devs nerf that weapon. Oops. Or maybe they make it so you can't move
robots backwards anymore, which was critical for your maneuvering. Or they buff
another weapon so that it becomes the hot new thing. There are a ton of ways to
screw yourself over if you program specific behavior instead of programming a
framework to define behavior. Especially later on, when you need to be making
changes and optimizing your strategy. If you can't easily try out multiple
strategies, you're locked in. And that doesn't feel good.

Our game plan was roughly this:  
1. Low level infrastructure (pathfinding, messaging, attacking, base building, robot building)  
2. Mid-level infrastructure (getting units to be able to move and coordinate in groups)  
3. High-level strategy (build orders, high-level decisions)

The idea is that you can't do anything without pathfinding and attacking, and
that code is not likely to change if the devs change the spec. Getting it out
of the way early in a robust and unhurried manner just makes sense. It's okay
if your player isn't the first one to charge the enemy base and wreck
everything in sight. If you have the first player with a solid pathfinder,
you're in the lead. The other teams will have to spend valuable days later in
the competition fixing all the edge cases in their hastily-coded pathfinder
while you're working on other stuff. Either that or they won't update it at all
and their pathing will suck, giving you a key advantage.

The goal is that by the final week you have all of your API and all of your
tools in place. You want to be able to have your robots do complicated actions
without writing that much code, because the final week is when the final
strategies start emerging. During the seeding tournament everyone sees what is
and what isn't effective, and there won't be many more spec changes in the
final week. The final week is the time when you want to be optimizing, and
maybe completely changing, your strategy. If you have a flexible enough
framework, you can adapt it to do whatever the emerging dominant strategies
are.

## Week 1: Trollin'
After talking it out for a while, the architecture we decided upon was a sort
of decentralized base approach. The theory was that we would create bases,
which would consist of buildings capable of producing robots, in various
locations and they would all produce robots. These bases would not know about
each other, thus the "decentralized" aspect. The robots themselves would be
organized into squads. To direct the squads, the bases would do all the
strategy calculations and send messages to the squads with instructions. These
missions could be scouting, attacking, defensive, or whatever we thought of
later. You'll see this break down later, but I still maintain that this was not
a terrible idea, but I think that it would take longer than one month to
implement properly. Part of the reason that we decided on this setup was
because unlike most teams, we had some solid messaging code left over from the
previous year. Eric Marion had come up with an extremely optimized, very
general system for sending any kind of message you could ever want. We used
that heavily in 2010, so my experience naturally led me to assume messaging
capability for greater coordination. I will readily admit that this was a
mistake. Just because messaging was instrumental and (relatively) cheap in 2010
did not mean that it was equally necessary and cheap in 2011.

The very first thing we began working on was a generic framework for building
robots. The desired behavior was to be able to have an enum specifying the
robot type and components, and the base would automagically be able to create
said robot. It ended up looking like this:

{% highlight java %}
public enum Unit {
    // Very tough melee unit
    IMMORTAL (Chassis.HEAVY, new ComponentType[] {ComponentType.RADAR,
    ComponentType.HAMMER, ComponentType.HAMMER, ComponentType.SHIELD,
    ComponentType.HARDENED, ComponentType.REGEN, ComponentType.JUMP}),
}
{% endhighlight %}

I assume that all teams ended up with some analogous bit of code, but I would
be willing to bet that many of them started by hacking something together
quick-and-dirty to get started. You may think you're saving time by doing that,
but as I said before, you gain no strategy intel from winning scrimmages
earlier and you're just going to have to replace that code later. So we got the
basics of this framework up and running and we used this same code throughout
the entire competition (though we did make numerous additions, there were very
few revisions). 

The second thing we wanted to get up and running was the base to squad
communication and the squad leader to squad follower communication. At this
point we were re-using messaging and navigation code from the previous year.
The majority of our first week was spent getting this behavior up and running
such that we could specify a "mission" (scout, attack, defend) and have a squad
of units go execute that mission. About one day before the Sprint Tournament
deadline, we stopped production on the general framework and began discussing
what strategy to implement for the tournament. Someone (probably Ethan)
discovered something about the Dummy component. You could create one dummy
every 5 rounds. Each dummy had 20 health and would only disappear when killed.
So each and every dummy component that you have is capable of producing 4 net
health per round, which far surpassed the damage of any weapon of equal weight.
Having made this discovery, we realized that it was extremely broken and that
the devs would have to eventually change the spec. However, since the Sprint
Tournament didn't really matter, we figured we would hammer home the point of
just how broken dummies were in the most hilarious way possible. So we put on
our troll faces and hacked up a player that would make squads of flying units
that just covered the map with dummies. Definitely not the most effective
player, but a pretty hilarious one. Also, as it turns out, kind of a bad idea.
Our player (with the help of another dummy-centric team) managed to crash the
entire tournament. We didn't see any results until...I think Wednesday. Whoops.
Sorry devs; that wasn't our intent. So the devs nerfed dummies by making them
disappear after 200 rounds and changing the cooldown so that they could only be
fired once every 20 rounds. 

## Week 2: Electric Boogaloo
What we saw from the Sprint Tournament was that the top teams went all-in with
tons and tons of light units. No one was doing any sort of central
coordination, and it seemed to be working pretty well for them. At this point,
we realized that doing this squad-based coordination-heavy architecture was
probably going to be waaaaay too difficult and take waaaay too long. So at this
point we scrapped all of the squad-specific code. That was hard. That was
really hard. Obviously it was a mistake to try to take this approach from the
beginning, but I think we made the right decision in cutting our losses and
trying a better architecture. 

In the wake of the Sprint Tournament we began to try to make a player that
could synchronize certain actions and guarantee some cohesive overall behavior,
but not need to be constantly messaging. It seems that every year there is some
resource or item in battlecode that is universal. This year, it was flux and
round number. Every robot could sense the flux reserve and tell what round it
was. When you have anything that is shared across all of your bots, chances are
you can use it to communicate. Here are some of the ways that we used it.

**Build prioritization**: Let me give you a f'rinstance. Let's say you have a
constructor sitting right next to a mine, ready to build a recycler. However,
recyclers are expensive, so while waiting you gain enough flux for your base to
build a heavy unit! Great! Then you will continue to build heavy units instead
of mines until you strangle yourself with lack of resources. The obvious
solution is to tell all of your units: "don't build x unit until we have y
amount of flux" This allows you to form a priority queue of units by varying
the y value. We further tuned this behavior by having build "phases" that were
triggered by round number. That way we could say: prioritize expanding from
round 0-200, then prioritize building troops until round 500, then go back to
prioritizing expansion. 

**Redundant bases**: Here's another one o' them tradeoff problems. Producing
units out of more than one location is a good thing. You get better map
coverage, you can defend territory better, and if one of your production
centers goes down you aren't screwed. Problem is, that requires you to set up a
factory, an armory, sometimes a static defense tower, and keep a bunch of
buildings turned on. That's a large resource drain. Our compromise was that
every time we built a new recycler in a place that would make a good base
(defined as 3 or more adjacent flux mines), they would check how much flux was
in our reserves. If it was fairly high, then they would decide to create a new
production center at that location. This isn't perfect, but it saved our asses
a lot of times. If our main base got destroyed, our flux would start piling up
and we would hit this trigger to construct a new base. There were a couple
teams that didn't build any additional bases ever and relied solely on keeping
the first one alive. That was (I hope) just due to lack of time on their part,
because we won several matches handily simply by taking out the buildings in
their starting location. We also tried to add code that would always establish
another production center near the center of the map, but that never worked
very well. That's one thing that I think we could have done better and I think
would have really improved our player.

Back to the tournament, we left off having just finished the Sprint Tournament.
The dominant emergent strategy that we saw was rushing the enemy base with
light units. They're fast, they don't require much tech, and they can cover the
entire map pretty thoroughly. Since we were scrapping the squad-based
architecture, we started moving in the direction of just covering the map with
independently-operating units, and started by putting together a light unit
rush. Even as we were working on that, we were also prototyping code for what
we thought of as a "late-game strategy" which consisted of using heavy units
with long sight range and messaging capability to spot enemies and direct our
milling attack units. We spent a TON of time on basic behaviors that would
yield massive performance benefits, such as making our base-building and
mine-finding code more efficient and robust, as well as optimizing all of our
bytecode usage to keep our units fast. Also, pathfinding with jump. We spent SO
much time just trying to get pathfinding to work properly with jump. That was a
really hard problem that we never did completely solve. 

At some point, because we were stupid and still thinking like this was a game
of Starcraft, we started optimizing our build behavior in terms of Starcraft.
We made a player that would start with a light rush and hammer the enemy base
until a specified turn, then shut down all the light units and use those
resources to build tech structures and start churning out medium units with
jump. Admittedly, the behavior looked pretty sexy, and we managed to convince
ourselves that it was streamlined and optimized. " do a light rush to grab
territory quickly, then do a fast tech switch to tier 2 units," we would say.
Yeah, problem was, that's not actually the best thing to do. Turns out that the
light rush was mostly just a giant waste of time. Building tech structures at
the beginning doesn't take nearly as long as it would in Starcraft, so you can
start off with stronger units and still grab roughly the same amount of
territory as a player that rushes lights. Also, the devs made some very
important changes to the game spec (buffing mediums and heavies) that screwed
light units even more. In addition, the devs had noticed that sometimes matches
would end quickly, since jump allowed units to cross a lot of ground quickly.
Their solution was to start making a bunch of maps that were larger and had
lots of walls so thick you couldn't jump over them. On these maps, light rushes
were useless because they would arrive waaaay too late to be of any use. So
this was a learning experience, but luckily we didn't just build a player that
executed this strategy. We built a player that was capable of executing this
strategy, or something else. We made sure that the code was flexible and could
be used for other purposes, so it wasn't a complete waste of effort.

**Short aside**: around the time that mediums and heavies got buffed and
whatnot, there was another important change. Basically, this one defensive
component, the shield, got broken slightly. As in, it was now possible to stack
a ton of shields on a unit and have it be functionally invincible. It would
take several hundred rounds of concentrated, heavy fire to kill a single light
unit. This was hilarious. We made some light units with shield stacks whose
only purpose was to draw enemy fire while our other lights, bedecked with
shooty bits, wiped them out. We called these decoy units "Banelings" Not
exactly the same, I admit, but it kept with the Zerg naming convention we had
going and it was as close as we could get. Banelings worked great for the few
days before the devs corrected their mistake and balanced shields again.
Overall, they were a waste of time. We shouldn't have spent time on anything
that was so dependent on the spec. My only defense is that we didn't spend
thaaaat much time on them, and they were fun to watch while they lasted.

**Shameless tooting of my own horn**: The middle of the second week marked the
point at which we finally had enough low-level code in place to start
experimenting with different strategies. This would be a good place to mention
a little side project of mine. Because I have an unhealthy obsession with
Battlecode, I decided that I wanted to do something to solve a little problem
of mine. You see, it's hard to really test your player thoroughly. In 2010,
Eric Marion wrote a cute little shell script that would allow us to quickly
load up a previous version of our player and play against it. That was great,
but frequently we would make some changes, lose a couple of matches against our
previous player, and declare the change to be detrimental. Well, maybe the
change is bad when playing against ourselves, but really good against other
strategies. Or maybe we just didn't watch enough matches and the new player
would have won on all of the other maps. Or maybe our new strategy was better
starting off in one position of the map than the other. Or maybe it was better
on smaller maps. Basically, you need moar data. So I made a tool that would
allow teams to play lots of matches against any version of their player and
view the data in aggregate.

So we had this testing tool, and we had this framework for quickly changing the
overall behavior and strategy of our player. These two things worked very well
together. We were able to quickly put together several different types of
strategies and the make them all fight each other for dominance. Admittedly,
this was not quite as good as getting input from playing against other teams,
but this was the next best thing. And we could do it as much as we wanted. This
was extremely useful for us. In one instance, there were a couple of teams that
were doing fairly well with a ton of flying units. So we made a player that
used that strategy (in about 20 minutes) and ran a few hundred matches against
it to find out what it was good at and what it's weaknesses were. 

So now that we had some high-level framework in place, we had some strategy in
the works, and we had settled on basically trying to cover the map with
double-jump heavies sporting dummy for defense and some unimportant weapon
loadout.

## Week 3: Strateeegery
The seeding tournament was, as usual, extremely informative. The final dominant
strategies had begun to emerge, and they were basically "make heavy units and
swarm the map" The main weakness we found with our build was that our heavies
used two jumps for added mobility, but sacrificing the firepower was just not
worth it for that extra jump. We also determined that it was going to be the
small features that separated the top teams. If everyone ended up using
jump-heavies to cover the map, the small optimizations are what would make the
difference. So we geared up to put the finishing touches on our player before
the final tournament.

Now would be a good time to mention what the late game looked like. It looked
like a robot graveyard. See, the devs had decided to make flux mines begin to
deplete after being mined for...I think 2000 rounds. To something like 10% of
their original production rate. This meant that around round 2500, everyone's
flux income suddenly dropped and they could no longer support their army. You'd
end up with a ton of deactivated heavy units littering the map. This was one
point where I disagreed with the dev's game decision, because it's really
BORING for the viewer and OBNOXIOUS for the developer. So the way we handled
this late-game situation was to turn off pretty much anything we could afford.
Tech structures, mostly. If I had thought of this earlier, I would have also
turned off certain heavies that hadn't seen an enemy unit in a long time. There
were a few times during the final competition where both sides completely shut
down, but over time our lone functioning base managed to eventually produce
units that did something productive enough for us to come back and win. So I
guess that it wasn't boring after all. 

In the final few days of development, we were feeling super pleased with
ourselves. We had fixed most of the low-level bugs in our behaviors, and had
the luxury of focusing mostly on straight-up strategy improvements. I would say
that the last 4 or 5 days were what gave us an edge over the other teams. While
they were working on...I don't even know what...we were thinking of the most
optimal behavior for our robots and, thanks to the testing server, we were able
to evaluate these behaviors. So we had this really awesome and extremely fast
pipeline from idea to implementation to evaluation that worked incredibly well.
One of the key ideas that came out of this was build switching. We made one
flying unit with a telescope that would fly out into the battlefield and detect
what components the enemy was using. Then it would fly back and relay that
information to the base. The base would then produce units that were optimized
to fight against those units. How did we know what was optimized? Well, Ethan
is a total baller. He ran the numbers for every weapon dealing damage to every
possible defensive configuration and put it in pretty table form. Adrian, as
elected co-baller, put the information into pretty graph form. Turns out, there
were only a few armor configurations that made sense (for example, plasmas
didn't stack nicely with anything else, but 4 shields + hardened was baller).
We just had some logic that counted up the numbers and types of weapons and
armors on the enemy and picked the optimal weapon/armor configuration from our
preselected options. Oh, and we stored our choices in team memory (an array of
longs that you can read in successive matches during the same best of 3 bout),
which allowed us to pull out the best weapons and armor at the beginning of
successive rounds. So yeah, this worked really well because as far as I could
tell, no other team had the luxury of implementing something like this, though
I'm sure that most of them thought of it. I would like to say that the process
of being able to think of new build orders and strategic actions, implement
them, and test them almost immediately was the most fun I have ever had working
on battlecode. I sincerely hope that you manage to reach that point during this
year's competition.

Now I'm going to share some of the sneaky sneaky things that we did. We had
several ideas that we thought were good. So good, in fact, that they didn't
even need to be tested against other teams. So we tested our player locally
with these ideas, but took them out before uploading to the scrim server. Any
time you do this sort of thing, there is a lot of risk involved. You never get
a real look at how your ideas perform in the wild, only against yourself. We
decided that it was worth it to keep these ideas hidden because we thought that
1) they were more likely to work than to fail and 2) they would be much more
effective if no one saw them coming. Surprise was our friend here and I think
it paid off.

**Sneaky maneuver #1**: Dummies. What? I thought they were nerfed!  
Yeah, turns out that nerfed dummies were still really strong. If you can trick
your enemy into destroying the dummy first, you've just avoided 20 damage
yourself, which is almost guaranteed to be better than any other armor for the
weight. Also, the way that most people prioritize targets is by health. You
want to destroy low-life targets first because that means there are fewer
enemies damaging you. Hey, guess what has less health than a heavy unit? A
dummy. This makes them higher-priority for most teams. You could theoretically
avoid this by prioritizing heavies over mediums, but we gambled that most teams
wouldn't do that because any additional code in the target-choosing loop must
be chosen verrrry carefully. Iterating through units is an easy way to waste
all your bytecode. Plus, none of the other teams had been using dummies since
the nerf, so most people thought they weren't a real threat. Another little key
to this strategy was that somewhere in the final week the devs released a spec
change that did some stuff to weapons and oh-by-the-way quietly fixed a bug
where dummies were detected to be "off" Now, I would wager a guess that most
teams (like us) had some code that prioritized shooting robots that were "on"
This means that previous evaluations of the effectiveness of dummies were
incorrect, because they were probably benefiting from this bug that allowed
them to accidentally deprioritize dummies.

**Sneaky maneuver #2**: Hammers & Immortals. No one touched hammers until the
final week. They were extremely weak in week one. They dealt less damage at
shorter range for a long time. Since no one was using them, the devs just kept
buffing the damage. It eventually reached a ridiculous level. Adrian did some
experimenting and came up with the idea of using heavies with two hammers,
jump, and a ton of armor. They worked really well. We called these units
Immortals. They had four configurations. All of them started with radar, jump,
and two hammers. We swapped the armor loadout depending on what weapons we saw
the enemy with. The armor sets were: (shield, hardened, regen), (4 shields,
regen), (4 plasmas), and (hardened, 4 shields, plating). Anyone that competed
last year will know that that amount of armor is ridiculous and will take most
weapons a while to get through. We also figured that tipping people off that
hammers were awesome was a bad idea, so we kept these guys off the scrim
server. Other teams did find out on their own and start using hammers in the
final couple days, but we did it first and I think we did it better. Did I
mention that they were programmed to jump behind their targets mid-fight?
Because they did. That's another thing that Adrian came up with and it's
brilliant. It's only effective maybe 1 in 10 tries, but it's super-dee-duper
cool when it works. We also prevented other teams from doing the same thing to
us by spinning in place for a few rounds if the enemy suddenly disappeared.

**Sneaky maneuver #3**: Probes. What are probes? Probes are medium units with
jump, a constructor, and a hammer. And they do exactly what you would expect
them to do. We got tired of having our constructor units passing by perfectly
good flux mines just because the enemy had built there first. So we made probes
and had them hammer down enemy recyclers. They were...moderately useful. In
retrospect, it may have been better to just stick with flying constructors like
everyone else. And there was no reason to keep them off the scrimmage server.
So...I think we got a little carried away with our own cleverness here.

So that was a bunch of information about how awesome we are and how much stuff
we did right, but I would like to say right now that even with all of these
things that I think we did better than other teams, I was not expecting us to
win. We actually lost to Calvin French-Owen of the team Codin' Solo in the
qualifying tournament. We were knocked into the loser's bracket and had to
fight through there to make it to the top 8 (during which time I felt like I
was constantly having a heart attack). The thing is, all of the top 8 teams had
very similar strategies, and they all had very solid players. I think we had a
few small advantages, but nothing killer. I believe that the nature of this
year's competition was that there was a lot of randomness. With everyone using
similar strategies, there was no rock-paper-scissors relationship like we saw
in previous years. If you look at the first round of finals, the bottom four
seeds beat the top four. I think that is indicative of just how evenly-matched
all the teams were. 

I would also like to give a shout-out to two of my favorite teams, In the Rear
With the Gear and Super Nintendo Chalmers. I think that In the Rear With the
Gear was a very solid team and they definitely deserved to be in the top 8.
Unfortunately, they got knocked into the loser's bracket in the qualifying
tournament by Toothless, and then were matched up against us. So we had to
knock them out to make it to the finals. This was very sad for everyone. I
firmly believe they deserved to be ranked in the top 8.

Super Nintendo Chalmers was definitely my very favorite team, though. They were
the only team that used an unorthodox strategy to great effect. They created
medium units that had satellites and messaging, and surrounded them with a
swarm of blind flyers with beams. Then they roamed around the map with these
"Carriers" as we called them. In one scrimmage against them, I saw a Carrier
lose a lot of flyers over time, so the whole thing turned itself off. Then a
bunch of reinforcements came by, they turned back on, and continued on their
merry way. I can really appreciate the thought and hard work that went into not
just using unit squads, but doing all these fancy little optimized behaviors.
The best part was that this strategy was actually pretty good. We won that
scrimmage, but it was a close match. Unfortunately, they were knocked into the
losers' bracket in the qualifying tournament by Team 8 and then also matched up
against us. As happy as I was that we got into the finals, I was extremely
saddened by the fact that we had to knock out our two favorite teams to get
there. Well, *my* two favorite teams.

I think that one thing we could have definitely done better is navigation. This
year's navigation code was built partially by me after working on navigation in
2010 and 2009. I had learned a lot from the previous two years, and I still
didn't manage to get it just right. Having to navigate with jumps didn't help.
Turns out that's really hard. I think all teams had some serious problems with
getting stuck in certain areas of the map, but that doesn't make our failure
any more satisfying. I think this also hit us a bit harder than other teams
because we didn't solely rely on flying units as constructors. We also used
Probes (mentioned above), which meant some of our most expensive constructors
were being held up by terrain and keeping us from taking additional resources.
If you watch our matches one of the overall trends you might notice is that in
almost all of them we take resources slower than the opponent and we were only
saved by the fact that we had more awesome units. 

I also think that we would have dominated if we had managed to get units
working together in squads. All the top teams (except Super Nintendo Chalmers)
used heavy units roaming around the map mostly alone. If we had gotten groups
of 3-4 mediums or pairs of heavies working together, we would have been
guaranteed to win almost every engagement. We also could have exploited some of
the lesser-used components like medic and iron. Up until the very end of the
tournament, Adrian was actually trying to create "reavers" and "shuttles" to do
reaver drops. The idea was to use dropship to ferry around some ridiculously
powerful blind units (blind so they could hold more weapons :D) that would be
spotted for by the dropship, and micro them extremely hard. Sadly, we didn't
have enough time to get it working at a competitive level, due mostly to the
fact that it's really complicated! Also, the dropship component had a ton of
bugs in it due to the fact that no one had ever tried it, so they had gone
unreported to the devs until the final week. RIP reaver drops...

I mostly just regret that time that we spent in the first week trying to hammer
out an extremely generic framework for decentralized squad-based behavior. I
think that it was a strategy decision that felt like an infrastructure
decision, and we really should have been working on lower-level mechanics at
that point. 

Well, lesson learned. I love Battlecode, I had a fantastic final year, and I
hope that this was useful, or at least entertaining.
