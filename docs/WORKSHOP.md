# Workshop description (draft)

Status: draft for the owner, written for the first build (0.1.0). It hasn't been pushed anywhere, and the build it
describes hasn't been watched in a game yet, so a line may change once the lab runs show what the player sees. The text
in the block below is Steam BBCode, ready to paste into the Workshop description.

The multiplayer section and the deal staying the same after a load and an age change describe how the build is meant to
work. None of that has been watched in a game yet; reword those lines if the lab runs or the two-machine run show
otherwise.

```text
[h1]Re-dealable Leader Abilities, Attributes, and Start Biases[/h1]

At game setup you choose what gets shuffled between leaders for this game. Leaders can take another leader's whole ability (Full random), another leader's whole package (Paired random), or a random hand of the separate bonuses inside every ability (Split random). You can also turn abilities, attributes or start terrain off for everyone, so all leaders start even. The game's own leader screens show what each leader ended up with, with a new line for where they like to start.

[h2]Where to find it[/h2]
In New Game, open Advanced Settings and expand [b]Re-dealable Leaders Settings[/b]. It has the seven main settings below, then [b]Leader pool...[/b], [b]Civilization pool...[/b], [b]Build your own leader...[/b] and [b]Advanced settings...[/b] buttons. Every list in the advanced windows has All and None buttons. The settings save with the game like any other setup option.

[h2]Preset[/h2]
A preset that sets the four settings under it in one go:
[list]
[*][b]Normal.[/b] The game as shipped: nothing is shuffled.
[*][b]Full random.[/b] Each leader gets another leader's whole ability, random attributes, and start terrain picked at random. None of the three is tied to the others.
[*][b]Paired random.[/b] Each leader gets another leader's whole package: ability, attributes and start terrain together. Amina might play with Pachacuti's mountain bonuses and start beside mountains.
[*][b]Logical split random.[/b] Abilities are broken into their separate bonuses and dealt out to random leaders along with the attributes, so the game's leaders are mixed and matched into new combinations. A leader's start terrain follows the bonuses it got, so whoever holds Pachacuti's mountain bonuses starts near mountains.
[*][b]Split random.[/b] The same deal as Logical split random, with start terrain picked at random as in Full random.
[*][b]Custom.[/b] What it reads once you change a setting below by hand.
[/list]
Each bonus is matched to the game effects that do it by their names, arguments and requirements. When one effect does the work of two bullet points (Genghis Khan's commander bonuses, for example) those bullets travel as one piece, so nothing is ever dealt that does nothing on its own.
Civilizations' start terrain is in the shuffle too, swapped within each age or rolled, as the Start terrain setting says.

[h2]Mix and match[/h2]
Each part has its own setting, so you can take a preset and change one thing:
[list]
[*][b]Leader abilities.[/b] Base game, Swap whole, Split up, or Off entirely.
[*][b]Leader attributes.[/b] Base game, Split up (each leader gets back as many as it gave), Follows ability, or Off entirely.
[*][b]Leader start terrain.[/b] Base game, Logical with bonuses, Follows ability, Random roll, or Off entirely.
[*][b]Civilization abilities.[/b] Base game, Swap whole (within the age), Split up, or Off entirely.
[*][b]Civilization uniques.[/b] Base game, Follows ability (whoever has Rome's ability also has the Legion), Swap whole (each civilization gets another same-age civilization's uniques), or Off entirely. Unique buildings and quarters go with the civics.
[/list]

[h2]Off entirely[/h2]
Each row's Off entirely value takes that part out of the game for everyone, which levels the field:
[list]
[*][b]Leader start terrain: Off entirely.[/b] The map places leaders and civilizations without any terrain preference.
[*][b]Leader abilities: Off entirely.[/b] Nobody has a leader ability. The AI keeps its agendas, so each leader still has its character.
[*][b]Leader attributes: Off entirely.[/b] Nobody starts with attributes, and everyone gets all twelve diplomatic actions instead.
[/list]
With all three off, it's the base game with every leader level. A leader's legend nodes in the attribute trees go with the bonuses they came with; with abilities off they're off too.

[h2]The other main settings[/h2]
[list]
[*][b]AI agendas.[/b] Base game, Logical with bonuses (the default, so the AI plays to the bonuses it got), or Swap whole (shuffled separately.
[*][b]Human players keep their own leader.[/b] Each human plays their chosen leader exactly as normal. Only the AI leaders are shuffled, among themselves.
[*][b]Reveal who got what.[/b] From the start, or When you meet them, which hides other leaders' shuffle until you've met them.
[*][b]Leader pool.[/b] As in Civilization VI: tick the leaders you want in the pool, then set a player slot (or your own leader) to Random from the pool and it gets one of them when the game starts. If the pool runs out, the slot gets a normal random leader.
[*][b]Civilization pool.[/b] AI players and Random slots only get civilizations ticked in the pool when the game starts. A civilization a player picks by hand stays as picked. For now this only covers the first age; at a new age the AI can still pick an unticked civilization.
[/list]

[h2]Build your own leader[/h2]
The [b]Build your own leader...[/b] button is directly above Select on the leader select screen (and in Re-dealable Leaders Settings); the civilization select screen has a [b]Build your own civilization...[/b] button for the civilization's cards: every civilization's ability, each of its uniques (units, buildings, quarters with their two buildings, improvements) and its start terrain, from the civilizations of your starting age, plus generic start terrain cards. Taking an ability gives that civilization yours in return; a unique moves, and its civilization goes without it. In a multiplayer lobby both buttons sit in the bottom row next to Mementos. The AI players are built from [b]AI leaders...[/b] in Re-dealable Leaders Settings: one row per AI slot with Build leader and Build civilization buttons, up to three AI leaders a game; your own screens link there. Each opens a screen laid out like the memento picker, with the settings it depends on in a strip under the header. Your leader's slots run along the top: one per bonus in its ability (or one wide slot for a whole ability), one per attribute, one for AI behavior, one for start terrain, and one for your civilization's start terrain when you've picked a civilization. Under them is every card in the shuffle: each leader's ability bonuses, whole abilities, the seven attributes, each leader's AI behavior and start terrain, and each civilization's start terrain, with a search box and filters by kind, type and leader. Click a card to fill the next open slot, click a slot to empty it. Whatever you don't take is shuffled among the AI leaders. Only the host builds a leader in this version, and the preset has to be anything but Base game.

[h2]Advanced settings[/h2]
[list]
[*][b]Split fairness.[/b] On a row set to Split up, Fair shares gives each leader about the same strength. Pure luck lets them fall where they fall.
[*][b]Shuffle number.[/b] The same number with the same settings and leaders gives the same shuffle. A new one is picked each time you set up a game, and it shows on the loading screen so you can share it with a friend.
[*][b]Choose which leaders are shuffled.[/b] Untick a leader and it plays as normal. Only leaders in this game are shuffled with each other, Random slots included. In an online game, if another human leaves their slot on Random, every ticked leader joins the shuffle, so a bonus can come from a leader who isn't playing.
[/list]

[h2]What you see[/h2]
What each leader got shows where the game already shows a leader's ability: the leader select screen, the loading screen, the diplomacy leader panel and the Civilopedia. Under the attributes there's a new line such as "Starts near: Mountains", which the game doesn't show anywhere on its own. It shows on Normal too, so you can see the game's own start terrain.

A "Who got what" panel in the game lists what each leader got and names any leader that was left out and why. In City Details, a percentage bonus the game files under "Other" shows by name under its yield instead, for the game's own leaders too.

[h2]Multiplayer[/h2]
It works through the game's own lobby. The host picks the settings and the shuffle number, and the other players see them. Each machine works out the same shuffle from the same number, and loading a save gives the same shuffle again, including after an age change.

[h2]Maps that place starts themselves[/h2]
Start biases only matter on maps that use them. The Earth maps place starts by their own routine, and so do true-start-location maps such as YnAMP, Massive Earth TSL, YAMEM and Custom Start Locations. On those, abilities and attributes are still shuffled and the start line says the map places the starts. Some replacement start scripts skip the island preference.

[h2]Other mods[/h2]
[list]
[*]Other mods' changes to the base game's leaders come along: a bonus another mod adds to a leader's ability travels with that ability.
[*]The leader select screen works the deal out before the game exists, from the base game's data. If another mod changes the leaders, the game's deal can differ, and the panel in the game says so.
[*]With Drongo's Syncretism Revealer on, its start bias panel is hidden whenever the preset isn't Base game, since it shows the game's own start terrain. Its syncretism panel stays.
[*]Leaders from other mods play normally unless you tick the boxes in Leaders from other mods (see below).
[/list]

[h2]Modded leaders[/h2]
Twenty-five leader mods built the way the base game's leaders are can join the shuffle. In Leaders from other mods (under Advanced settings), tick Shuffle their abilities, Shuffle their attributes or Shuffle their start terrain (each is separate), and a supported leader whose mod you have installed and turned on is checked against its files at setup. A leader that passes is shuffled like the base game's leaders. One that fails plays normally, and the "Who got what" panel says why. In multiplayer the host's check decides for everyone.

[h2]For modders[/h2]
To have your leader added, build it like this and ask:
[list]
[*]Define the leader the usual way: its type, its Leaders row and its LeaderItems ability row.
[*]Build the ability as a leader trait whose modifiers do all the work, with the description as a bullet list, one bullet per bonus.
[*]Don't use scripts for gameplay. A script that only registers the leader's portrait is fine.
[*]Use "player's leader is X" requirements only for unlocks and leader-level rewards, never on an ability's modifiers.
[*]Then ask us in a Workshop comment or a GitHub issue to review the leader. Once it's listed, it's shuffled in every setting as long as the mod keeps meeting these rules, and that's checked each game.
[/list]

[h2]Limits[/h2]
The settings are picked at setup and stay fixed once the game starts. A loaded save's loading screen shows the game's own ability text; the diplomacy panel and the Civilopedia show the shuffle. English only for now.
```
