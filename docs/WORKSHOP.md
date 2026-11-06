# Workshop description (draft)

Status: draft for the owner, written for the first build (0.1.0). It hasn't been pushed anywhere, and the build it
describes hasn't been watched in a game yet, so a line may change once the lab runs show what the player sees. The text
in the block below is Steam BBCode, ready to paste into the Workshop description.

The multiplayer section and the deal staying the same after a load and an age change describe how the build is meant to
work. None of that has been watched in a game yet; reword those lines if the lab runs or the two-machine run show
otherwise.

```text
[h1]Re-dealable Leader Abilities, Attributes, and Start Biases[/h1]

At game setup you choose how the leaders are mixed up for this game. Each leader can take another leader's ability, attributes and start bias, or the abilities can be broken into their bullet points and dealt out at random. You can also switch abilities, attributes or start biases off for a game where all leaders start on equal footing. The game's own leader screens show what each leader got, with a new line for where they like to start.

[h2]Where to find it[/h2]
In New Game, open Advanced Settings and press [b]Re-dealable Leaders...[/b]. A window opens on the main choices: how leaders are re-dealt, the three switches, keeping your own leader, and when everyone's deal is shown. Press [b]Show advanced settings[/b] for the rest: dealing, AI personality, the deal number, which leaders are in it, leader pools and modded leaders. The settings save with the game like any other setup option.

[h2]How leaders are re-dealt[/h2]
[list]
[*][b]Not re-dealt.[/b] Leaders play as the game ships them. The Off switches below still work.
[*][b]Swap whole abilities.[/b] Each leader takes another leader's whole ability, two random attributes, and a start bias rolled from scratch. The three aren't tied to each other.
[*][b]Swap whole leaders.[/b] Each leader takes another leader's whole package: ability, attributes and start bias together. Amina might play with Pachacuti's mountain bonuses and start beside mountains.
[*][b]Split abilities, matched starts.[/b] Abilities are broken into their bullet points and dealt out with the attributes. Each leader gets back as many pieces as they gave, and their start bias comes from the pieces they got, so whoever holds Pachacuti's mountain bullets starts near mountains.
[*][b]Split abilities, random starts.[/b] The same deal, with start biases rolled from scratch.
[/list]
Each ability's bullets are checked by hand before they're dealt one by one. Until a leader's bullets have been checked, that leader's ability is dealt whole in the split modes, alongside the attributes, which are always dealt one by one. In this first version no leader has been checked yet, so for now the split modes deal whole abilities and single attributes.
Civilization start biases are in the mix too. Swap whole leaders and Split abilities, matched starts hand each civ's bias to another civ of the same age, so England's island start might go to Prussia. The two modes that roll start biases from scratch roll the civs' biases as well.

[h2]Switches for a game on equal footing[/h2]
[list]
[*][b]Start biases: Off.[/b] The map places leaders and civilizations without leaning toward any terrain, whatever the mode.
[*][b]Leader abilities: Off.[/b] Leaders play without their abilities. The AI keeps its agendas, so each leader still has its character.
[*][b]Leader attributes: Off.[/b] Leaders play without attributes, and each leader gets all twelve diplomatic actions the attributes would have unlocked, so everyone has the same set.
[/list]
With all three off, it's the base game with all leaders level. A leader's legend nodes in the attribute trees go with the bonuses they came with, and with abilities off they're off too.

[h2]More main choices[/h2]
[list]
[*][b]Keep my leader as chosen.[/b] Each human player keeps the leader they picked as the game ships it. The AI leaders are re-dealt among themselves.
[*][b]Show what everyone got.[/b] At the start, or As you meet them, which keeps other leaders' deals hidden until you've met them.
[/list]

[h2]Advanced settings[/h2]
[list]
[*][b]Dealing.[/b] Balanced evens out the strength of the pieces each leader gets in the split modes. Pure chance lets them fall where they fall.
[*][b]AI personality.[/b] Stays with the leader, Follows the ability (the default, so the AI plays like the leader whose bonuses it holds), or Re-dealt too.
[*][b]Deal number.[/b] The same number with the same settings and leaders gives the same deal. Setup picks a new one each time, and it shows on the loading screen so you can share a roll with a friend.
[*][b]Leaders to re-deal.[/b] Switch a leader off and it plays as shipped. Only the leaders in the game are re-dealt among themselves, including the ones picked for Random slots. In an online game, if another player leaves their own slot on Random, every leader still switched on goes into the deal, so bonuses can come from leaders who aren't playing.
[*][b]Leader pool 1 and Leader pool 2.[/b] As in Civilization VI: tick the leaders for a pool, then set a player slot to Random from pool 1 or Random from pool 2, and that slot gets a leader from the pool when the game starts. Two slots never get the same leader.
[/list]

[h2]What you see[/h2]
The re-dealt ability, attributes and start bias show where the game already shows a leader's ability: the leader select screen, the loading screen, the diplomacy leader panel and the Civilopedia. Under the attributes there's a new line such as "Starts near: Mountains", which the game doesn't show anywhere on its own. It shows in Not re-dealt games too, so you can see the game's own start biases.

A "Who got what" panel in the game lists each leader's deal and names any leader that was left out and why. In City Details, a percentage bonus the game files under "Other" shows by name under its yield instead, for the game's own leaders too.

[h2]Multiplayer[/h2]
It works through the game's own lobby. The host sets the mode, the switches and the deal number in the window, and the other players see them there. Each machine works out the same deal from the same number, and loading a save gives the same deal again, including after an age change.

[h2]Maps that place starts themselves[/h2]
Start biases only matter on maps that use them. The Earth maps place starts by their own routine, and so do true-start-location maps such as YnAMP, Massive Earth TSL, YAMEM and Custom Start Locations. On those, the abilities and attributes are still re-dealt and the start bias line says the map sets the starts. Some replacement start scripts skip the island bias.

[h2]Other mods[/h2]
[list]
[*]Other mods' changes to the base game's leaders come along: a bonus another mod adds to a leader's ability travels with that ability.
[*]The leader select screen works the deal out before the game exists, from the base game's data. If another mod changes the leaders, the game's deal can differ, and the panel in the game says so.
[*]With Drongo's Syncretism Revealer on, its start bias panel is hidden in the shuffle modes, since it shows the game's own biases. Its syncretism panel stays.
[*]Leaders from other mods play as their mods ship them unless you tick the modded leaders' boxes (see below).
[/list]

[h2]Modded leaders[/h2]
Twenty-five leader mods built the way the base game's leaders are can join the deal. Under Advanced settings, tick Modded leaders' abilities, Modded leaders' attributes or Modded leaders' start biases (each is separate), and a listed leader whose mod you have installed and turned on is checked against its files at setup. A leader that passes is dealt like the base game's leaders. One that fails plays as its mod ships it, and the "Who got what" panel says why. In multiplayer the host's check decides for everyone.

[h2]For modders[/h2]
To have your leader added, build it like this and ask:
[list]
[*]Define the leader the usual way: its type, its Leaders row and its LeaderItems ability row.
[*]Build the ability as a leader trait whose modifiers do all the work, with the description as a bullet list, one bullet per bonus.
[*]Don't use scripts for gameplay. A script that only registers the leader's portrait is fine.
[*]Use "player's leader is X" requirements only for unlocks and leader-level rewards, never on an ability's modifiers.
[*]Then ask us in a Workshop comment or a GitHub issue to review the leader. Once it's listed, it's dealt in all modes as long as the mod keeps meeting these rules, and that's checked each game.
[/list]

[h2]Limits[/h2]
The settings are picked at setup and stay fixed once the game starts. A loaded save's loading screen shows the game's own ability text; the diplomacy panel and the Civilopedia show the deal. English only for now.
```
