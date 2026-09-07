# Werewolves · The village

A Retro Museum activity for 4–16 players, in English, French and Tagalog. Automatic narration, several nights, private held role cards and an eyes-open night variant.

## Build

npm install
npm run build
npm test

The committed dist/game.rmg.json is the immutable game package submitted to the [Retro Museum marketplace](https://github.com/manaty/retro-museum-marketplace). Install it from your museum's marketplace panel or launch it with the SDK standalone host. The game engine is also exported as @manaty/game-werewolf/engine.

## Attribution

Code and bundled assets: Manaty, MIT. Village artwork and prerecorded narration were generated with AI for this project; narration uses OpenAI's preset marin voice. No API call is needed during gameplay. No copyrighted commercial ROM is included.

## Rules

The narrator runs reveal, night actions, dawn, debate and voting. Late arrivals spectate until replay. At four: one wolf, one seer, two villagers. A witch joins the deck from five players, a hunter from six. Each fresh match shuffles roles independently.
