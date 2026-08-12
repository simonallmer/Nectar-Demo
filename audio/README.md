# Nectar — audio

```
audio/
  music/    the score. Real files, streamed at runtime.
    playlist.json          play order + titles
    01-march-of-the-bees.mp3
  sfx/      the effects. No files here on purpose — see below.
```

## Music

Drop a new track in `music/` with the next number prefix and add a line to
`playlist.json`. Nothing in `index.html` needs to change — the playlist is
fetched at runtime.

The score starts when a game begins and plays the list in order. When the last
track ends it goes quiet and stays quiet; it does not loop.

**Serve the game over http, not off disk.** Opening `index.html` straight from
Finder gives you working sound effects and no music: `file://` blocks the fetch
of `playlist.json`, and a media element loaded from `file://` is opaque to Web
Audio, so routing it through the mixer yields silence. Both cases are handled —
there is a built-in fallback track list, and off disk the music bypasses the
mixer and plays through the element directly — but ducking is lost that way and
the playlist is ignored. `./serve.sh` and open the localhost URL.

**Format:** MP3. Every browser plays it. M4A/AAC works in Chrome, Safari and
Edge but is patchier in Firefox, so MP3 is the safe default for anything that
ships. 48 kHz stereo around 190 kbps is a good target — the current track is
5 MB for 3:36, and that whole file has to be in both git repos.

## SFX

There are no sound effect files, and that is deliberate. Every effect —
the bee move, the capture, the nectar chimes, the dice, the UI clicks — is
**synthesised in code at runtime** by the `Sound` module in `index.html`
(search for `── AUDIO ──`). Oscillators, filtered noise and envelopes, built
through the Web Audio API.

Why it is done this way:

- Nothing to download, so the first click can make a sound with no loading.
- No binary assets to keep in sync between `Nectar` and `Nectar-Demo`.
- Every trigger is slightly different — pitch, timing and the slice of noise
  all wander — so the same effect a hundred times never phases into one
  identical sample.
- A tweak is a number, not a re-record.

**To hear them all:** open the game with `?soundtest=1` and every cue gets a
button. The panel never appears without that flag.

**Levels:** the player sets Sound Effects and Music independently under
Options in the main menu, and both are remembered. Effects are calibrated at
100%; music defaults to 55% because it plays continuously under everything.

**To change one:** find its function in the `Sound` module (`move`, `capture`,
`pickup`, `score`, `chain`, `boost`, `bloom`, `dice`, `turn`, `denied`, `ui`,
`win`, `aim`, `select`) and edit it.

If a recorded one-shot is ever layered under a hero effect — a real impact
under `capture`, say — this is where the file would live, and the `Sound`
module would need a small loader to go with it.
