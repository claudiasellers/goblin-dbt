# Somatic Lab

Nine small clickable prototypes of the Wave-1 somatic tools for Goblin DBT, so you can feel each one on a phone. They are for reference only and are not production code. Each tool is one self-contained HTML file (vanilla HTML/CSS/JS, Canvas/SVG and Web Audio, with no external scripts or fonts). `index.html` is the landing page and lists them in Wave-1 order.

| # | File | Tool (card) |
|---|---|---|
| 1 | `01-press-and-push.html` | Press and push (M26, M27) |
| 2 | `02-hand-on-heart.html` | Hand on heart (M29, M30) |
| 3 | `03-squeeze-and-drop.html` | Squeeze and drop (M31) |
| 4 | `04-voice-room.html` | Voice room: Voo, Bee hive, Siren up (M10–M12) |
| 5 | `05-outside-in-scan.html` | Outside-in scan + Does this fit? (M36, M35) |
| 6 | `06-shake-and-stomp.html` | Shake and stomp (M32, M17) |
| 7 | `07-pocket-stone.html` | Pocket stone (M20) |
| 8 | `08-sound-compass-edge-glow.html` | Sound compass + Edge glow (M25, M23) |
| 9 | `09-yuck-or-queasy.html` | Yuck or queasy? (P8) |

## How to open

**Quickest:** open `index.html` in a browser. Everything that uses touch works straight from the file. The mic and motion sensors need a secure context, though, so they only work over `https://` or on `localhost`.

**On your phone (same Wi-Fi):**

```sh
npx serve prototypes/somatic-lab
```

Open the LAN URL it prints (e.g. `http://192.168.1.20:3000`) on the phone. Touch, sound and haptics work. Over plain `http` on a LAN address the mic and motion sensors are blocked, and the prototypes fall back to touch.

**Mic and motion on a phone:** these need `https`, and iOS Safari is strict about it. Two options:

- Serve locally over https, e.g. `npx vite prototypes/somatic-lab --host --https` (with `@vitejs/plugin-basic-ssl`, or any dev server that can serve a self-signed certificate). Accept the certificate warning on the phone once.
- Use a Firebase Hosting preview channel. Copy the folder into the built site (e.g. `dist/somatic-lab/`), then run:

  ```sh
  firebase hosting:channel:deploy somatic-lab
  ```

  Open `<preview-url>/somatic-lab/` on the phone. You don't need ngrok or another tunnel.

On iOS, motion needs a tap on the in-page "allow" button (`DeviceMotionEvent.requestPermission` / `DeviceOrientationEvent.requestPermission`), and sound stays off until you tap to turn it on. iPhones don't vibrate from the web, so every haptic cue also has a visual and a sound cue.

## Notes

- **Copy, gates and the "what we'd log" output are placeholders.** In production the words, band gates and records come from the graph. The copy drafts follow the Wave-1 validation-first table and still need the copy review.
- Nothing is saved. Pocket stone keeps its collection in memory only (the two earlier stones are fake), and the mic is analysed on the device and never recorded or sent.
- Sources: `Somatic – Phone-Only Priority Matrix` (Wave 1, P8) and `Somatic – Digital Delivery & Mechanics` (M-cards).
