# Goblin branding kit: position, three palettes, mark

Written 2026-09-13 on `design/dear-man-token-pass`. Companion to
`app-design-plan.md`, which deferred the palette question. This document
opens it. Nothing in `src/` changes on the strength of this file.

Contrast ratios below were computed with a small WCAG 2 script
(sRGB relative luminance) and the field-edge midpoints with an OKLCH
interpolation of the light-theme hues; both are in the session scratchpad,
not the repo.

## Brand position

Goblin is the small, unbothered creature that sits with you when your
brain is loud, and helps you find the word for it and the next thing to
do. It is not pretty and it is not a tracker; it is plain, warm, and
practical, and it never asks you to be presentable first. The visual
system should feel like that: quiet at rest, one clear move forward per
screen, and the person's own words the only decoration.

## 1. What the evidence says (and does not)

- **Red raises rated arousal; the effect is real but small.** The best
  single study on the arousal claim (Buechner & Maier, 305 undergraduates,
  red vs blue frames) found red increased arousal ratings regardless of
  context, while its effect on negativity depended on context; the authors
  call the effect sizes "very small" and ask for replication.
  [PMC5045874](https://pmc.ncbi.nlm.nih.gov/articles/PMC5045874/)
- **The field as a whole is immature.** Elliot's 2015 review concludes the
  literature is "at a nascent stage" and recommends "patience and prudence"
  about real-world application. Earlier claims that long wavelengths
  (red) are arousing and short (blue) calming have mostly produced null
  results under rigorous methods.
  [Frontiers in Psychology 2015](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2015.00368/pdf)
- **Physiological arousal tracks lightness more than hue.** A 2023 VR
  study found darker environments and, secondarily, saturated warm hues
  raised skin conductance; lightness was the stronger lever.
  [PMC10565396](https://pmc.ncbi.nlm.nih.gov/articles/PMC10565396/)
- **Distressed users ask for restraint.** Young people co-designing a
  mental-health app preferred "subtle use of colour within sophisticated,
  dark palettes" and named red and orange as colours to avoid.
  [Garrido et al. 2024](https://journals.sagepub.com/doi/10.1177/14604582241295948)
  In a school screening app, pupils asked that a red "high risk" zone be
  replaced with a green-to-amber gradient that darkens with the score.
  [PMC8787665](https://pmc.ncbi.nlm.nih.gov/articles/PMC8787665/)
- **Alexithymia: nothing on colour.** The alexithymia literature is about
  interoception and reduced limbic response to emotional stimuli, not
  colour perception. "Emotional colour-blindness" is a metaphor, not a
  finding. Do not claim the palette helps people with alexithymia. What
  does help them is the thing the app already does: offering words.
  [PMC3621096](https://pmc.ncbi.nlm.nih.gov/articles/PMC3621096/)

Design implications, held loosely: keep the HU quadrant off pure
saturated red (coral or raspberry, not fire-engine); keep the
high-arousal screens light or mid-toned rather than heavy black; reserve
one crimson for the crisis path only; and do not let the field's HU corner
be the brightest thing on screen at 8 out of 10.

## 2. Competitive scan

Observations of the current shipping products; store links where I could
not find a brand page.

| App | What they do | What not to copy |
|---|---|---|
| [How We Feel](https://apps.apple.com/us/app/how-we-feel/id1562706384) | Saturated red / yellow / blue / green quadrants on near-black; monochrome UI, big type | The exact four hues, and red for HU. Goblin's field should read as a sibling, not a clone |
| [Finch](https://apps.apple.com/us/app/finch-self-care-pet/id1528595748) | Pastel yellow, peach and mint around a bird mascot; cute companion register | The cuteness. Goblin is a creature too, and must not land here |
| [Bearable](https://bearable.app) | Violet primary, dense tracker dashboards, symptom colour scales | Purple-as-wellness default; dashboard density |
| [Headspace](https://www.itsnicethat.com/articles/italic-studio-headspace-graphic-design-project-250424) | Orange primary, blob illustration, rounded sans | Orange plus blobs is now the meditation-app default |
| [Calm](https://www.calm.com) | Blue gradients, lake-and-mountain imagery, navy dark | Nature-photo serenity; blue means "calm app" to everyone now |
| [Woebot](https://woebothealth.com) | Mint and teal with a robot character, white chat cards | Chatbot teal; a mascot that talks |
| [Daylio](https://daylio.net) | Dark default, five-step red-to-green mood scale | The traffic-light valence scale. It grades feelings |
| [Reflectly](https://reflectly.app) | Pink-purple-blue gradients everywhere | Gradient as identity |
| [DBT Coach](https://www.resiliens.com/en/dbt-coach) | Lavender palette, course-like content grid, stock illustration | The clinical-course look; DBT content presented as a syllabus |
| [Jour](https://apps.apple.com/us/app/jour-journal-for-mindfulness/id1444383251) | Deep navy dark theme, soft serif, guided journaling | Closest to Goblin's current dark navy. A reason to move the field ground off navy |

The gap: nobody in this set is warm without being cute, or dark without
being navy, and nobody uses a green that is not teal or mint.

## 3. The name

"Goblin" carries two meanings and both help. In folklore the goblin is
the small ugly creature that lives in the house and is up at night, which
is when this app gets used. On the internet, "goblin mode" (Oxford's 2022
word of the year) means unapologetically unpolished, rejecting the
performance of being fine
([Washington Post](https://www.washingtonpost.com/lifestyle/2022/12/06/goblin-mode-meaning-oxford/)).
That is the permission a DBT app should give: come as you are, we will
find the word and the next step. The risk is the third meaning, the
greedy trickster. The brand stays safe by never drawing a face with teeth,
never drawing green skin, keeping the word lowercase and small, and letting
the goblin be implied (ears, a lantern, a shape in the dark) rather than
depicted.

### Mark directions

1. **The lantern.** A single line-drawn lamp with a soft filled glow, the
   thing a goblin carries through the dark. Reads as "a light when things
   are dark" without any wellness cliché, tints to ink or action, and works
   at 16px. Pairs naturally with palette B.
2. **The field with ears.** A rounded square (the emotion field itself)
   with two soft pointed bumps at the top corners. The creature *is* the
   field: the four quadrants are its face without a face. Most specific to
   Goblin; hardest to get right at small sizes.
3. **The split leaf.** Keep the leaf but redraw it in ink: one leaf whose
   central vein forks into two, for the dialectic (two things true at
   once). Honest continuity with the current mark.

**Should the leaf stay?** Only as direction 3. The 🌿 emoji should go
regardless (it is the iconography decision in the design plan), and a
generic leaf says "wellness" to everyone. If the mark is 1 or 2, drop the
leaf entirely rather than keep it as a secondary glyph.

### Wordmark

**Fraunces carries the wordmark.** The design plan's rule is that the
serif marks words about the person and the sans is the tool talking; the
name is the one word that is about the relationship, not an instruction.
Fraunces' soft "wonk" axis also gives the letters a slightly hand-made,
creaturely quality that suits the name, where a DM Sans wordmark is
indistinguishable from any SaaS. Set `goblin` lowercase, Fraunces 600,
`WONK` 1, optical size low, tracking -1%. DM Sans remains the type for
everything else, including any tagline under the mark.

## 4. Palettes (three originals, three added after review)

Conventions: the field ground is named per palette (it is currently dark
navy in both themes). Quadrant text tokens are used for chip labels on a
10% tint of the hue over paper (light) or the hue itself as text on a 14%
tint over paper (dark). "Field midpoint" is the OKLCH blend of the two
edge hues, to show the edge does not pass through grey.

A correction added after the first round: the field has four edges, not
two. The left edge (HU to LU) blends the short way round the hue circle,
through magenta and violet, and the right edge (HP to LP) blends through
yellow-green. Computed midpoints for Signal: top `#F38E17` (h61), bottom
`#0096B2` (h217), left `#BB58B2` (h331), right `#99B43D` (h121). So no
hue is free once all four edges blend; an action colour can only be
distinct from the field by lightness and chroma, not by hue. That is the
premise of the two palettes added below.

### A. Slate & Spruce

*Evolve Cool Steel: keep the fog-and-steel neutrals, deepen the accent
from teal to spruce, pull the HU corner from rose to coral so the crisis
crimson can own red.*

| Token | Light | Dark |
|---|---|---|
| Page | `#F5F7F9` | `#0D1017` |
| Paper | `#FFFFFF` | `#161B24` |
| Ink | `#161B22` | `#E6EAF0` |
| Secondary text | `#566072` | `#98A1B3` |
| Action (spruce) | `#1F6B52` | `#1E7A5D` |
| Danger (wine) | `#A02E45` | `#DB6078` |
| Field ground | `#0F1626` | `#0F1626` |
| HU coral | `#D9805F` (text `#9A4A2C`) | `#E29272` |
| HP amber | `#D3B05A` (text `#7D6420`) | `#DEBD6C` |
| LU slate blue | `#7B8FC9` (text `#44568F`) | `#8FA1D6` |
| LP sage | `#6FAE98` (text `#2F6F5C`) | `#7FBFAA` |

Contrast: ink on page 16.1 (dark 15.8); white on action 6.4 (dark 5.3);
white on danger 7.1; quadrant text on tint 5.3 to 6.4 light, 5.4 to 7.1
dark. Hues on the navy field 5.7 to 8.7. Field midpoints: top edge
`#DC9455` (warm orange, chroma 0.12), bottom edge `#59A4BB` (teal, 0.08).
HU hue 41 vs danger 13.

On the field: familiar, a touch warmer at the top edge than today. On a
saved DEAR MAN plan card: white paper, spruce for the one button, quiet.
Downside: it is the current app with the volume adjusted; it will not
change anyone's mind about what Goblin looks like, and the spruce still
sits in the teal-green neighbourhood the brief asked to leave.

### B. Moss & Lantern

*Warm and earthy without cream or clay: a pale green-grey page like
paper in a forest, moss for "go", raspberry rather than red at the top
left, brick reserved for crisis.*

| Token | Light | Dark |
|---|---|---|
| Page | `#F1F3EE` | `#121611` |
| Paper | `#FBFCF9` | `#1B211A` |
| Ink | `#1B2420` | `#ECEDE6` |
| Secondary text | `#5B665E` | `#A2AA9C` |
| Action (moss) | `#55671E` | `#5F7520` |
| Danger (brick) | `#A6381F` | `#E8705A` |
| Field ground (moss night) | `#161B14` | `#161B14` |
| HU raspberry | `#D45A78` (text `#93314C`) | `#E27A94` |
| HP marigold | `#E0A93A` (text `#7A5610`) | `#EBBD57` |
| LU juniper | `#6A86B8` (text `#3D5482`) | `#8AA3D0` |
| LP fern | `#7AAE6A` (text `#3E6E31`) | `#93C283` |

Contrast: ink on page 14.2 (dark 15.5); white on action 6.3 (dark 5.2);
white on danger 6.5; quadrant text on tint 5.4 to 6.6 light, 4.7 to 6.9
dark. Hues on the field ground 4.8 to 8.5. Field midpoints: top edge
`#E77C4B` (coral-orange, chroma 0.15), bottom edge `#36A3A9` (teal, 0.10).
HU hue 7 vs danger 34; they also differ in lightness and saturation, so
the crisis colour is unmistakably not a quadrant.

On the field: the four corners read as flowers in dark moss rather than
lights on a dashboard; the top edge is the warmest of the three. On a
saved DEAR MAN plan card: off-white paper on a green-grey page looks like
a page torn from a notebook, Fraunces headline in ink, one moss button.
The name and the mark (lantern) land here without effort. Downside: a
green-grey page can drift toward institutional if the tints are not kept
clean, and the moss action is the least "obviously a button" of the three
for someone at high arousal who needs to find it fast.

### C. Signal

*High contrast and saturated: near-black ink, HWF-strength quadrant hues
tuned so HU is vermilion-orange rather than red, and a violet action,
chosen on the belief that purple was the one hue the quadrants leave free.
That belief was wrong; see "Signal, revised" below.*

| Token | Light | Dark |
|---|---|---|
| Page | `#F8F8F6` | `#0B0B10` |
| Paper | `#FFFFFF` | `#15151D` |
| Ink | `#101014` | `#F2F2F5` |
| Secondary text | `#4B4F5C` | `#A5A8B5` |
| Action (iris) | `#5B2D8E` | `#6E3FAA` |
| Danger (crimson) | `#B01240` | `#F0507A` |
| Field ground | `#0B0B10` | `#0B0B10` |
| HU vermilion | `#E8663A` (text `#9E3A14`) | `#F27B52` |
| HP yellow | `#F2B824` (text `#7A5600`) | `#F7C53F` |
| LU cobalt | `#3F6FD6` (text `#2B4FA3`) | `#6E93E6` |
| LP green | `#2FA36B` (text `#1D6E46`) | `#4FC08A` |

Contrast: ink on page 17.9 (dark 17.6); white on action 9.5 (dark 7.1);
white on danger 7.0; quadrant text on tint 5.6 to 6.7 light, 4.9 to 8.3
dark. Field midpoints: top edge `#F38E17` (orange, chroma 0.17), bottom
edge `#0096B2` (cyan, 0.11). HU hue 39 vs danger 13. One flag: light-theme
cobalt on the near-black field is 3.8:1, fine for a fill but the LU
corner's words would need the dark-theme `#6E93E6`.

On the field: the closest to How We Feel, vivid and legible at arm's
length, and the easiest to read at 8 out of 10. On a saved DEAR MAN plan
card: crisp black-on-white with a violet button, closer to a good
stationery brand than a wellness app. Downside: it argues with the
evidence and with what distressed users asked for; the top-left corner is
the loudest object on screen exactly when the user is loudest, and violet
as "go" has to be learned.

### C2. Signal, ink

*Everything in Signal except the button: near-black ink, high contrast,
HWF-strength corners with a vermilion-orange HU, and an ink-colored action
so that hue belongs to the quadrants and nothing else.*

Candidates checked for the action (light theme; white text on each):

| Candidate | Hex | OKLCH | White on it | Verdict |
|---|---|---|---|---|
| Ink | `#16161C` | L0.20 C0.01 h285 | 18.0 | **Chosen.** No hue to collide with anything |
| Deep forest | `#1E4D3A` | L0.38 C0.06 h164 | 9.6 | Same hue as the LP corner (h158); reads "low-pleasant, darker" |
| Ink-blue | `#1F2C5C` | L0.31 C0.09 h269 | 13.3 | Same hue as LU cobalt (h263), and navy is the generic choice |
| Walnut | `#4B3B30` | L0.37 C0.03 h56 | 10.7 | Muddy; on a black-and-white page it reads as a disabled state |
| Deep wine | `#5A1E33` | L0.33 C0.09 h2 | 12.6 | Eleven degrees from the crisis crimson (h13); the one collision that matters most |

| Token | Light | Dark |
|---|---|---|
| Page | `#F8F8F6` | `#0B0B10` |
| Paper | `#FFFFFF` | `#15151D` |
| Ink | `#101014` | `#F2F2F5` |
| Secondary text | `#4B4F5C` | `#A5A8B5` |
| Action (ink) | `#16161C`, white text | `#ECECF1`, ink text `#101014` |
| Danger (crimson) | `#B01240` | `#F0507A` |
| Field ground | `#0B0B10` | `#0B0B10` |
| HU vermilion | `#E8663A` (text `#9E3A14`) | `#F27B52` |
| HP yellow | `#F2B824` (text `#7A5600`) | `#F7C53F` |
| LU cobalt | `#3F6FD6` (text `#2B4FA3`) | `#6E93E6` |
| LP green | `#2FA36B` (text `#1D6E46`) | `#4FC08A` |

Contrast: white on action 18.0 light; in dark the button inverts to paper
with ink text, 16.1, and stands off the page at 16.7. Everything else is
as in Signal (ink on page 17.9 / 17.6, quadrant text on tint 5.6 to 6.7 /
4.9 to 8.3, white on danger 7.0).

On the inversion: the brief asked for white text on the filled button in
both themes. A dark button on a `#0B0B10` page cannot do that and still be
found: graphite `#3A3A46` gives white text 11.2 but sits at only 1.8
against the page, which at 8 out of 10 is a button you have to hunt for.
Inverting is what every stationery-grade dark theme does (a light bar on
a dark page), and it keeps the one rule that matters: the action is the
highest-contrast object on the screen. If the white-text rule is firm,
graphite is the fallback and the loss is findability, not legibility.

On the field: identical to Signal. On a saved DEAR MAN plan card: black
type, white paper, one black bar; the only colour on the card is the
quadrant chip. Downside: an ink button carries no warmth and no "go"
signal of its own; it relies entirely on position and copy ("Save this
plan") to say what it does, and the same rule that makes it work forbids
any second dark bar on the screen.

### D. Moss & Vermilion (B/C hybrid)

*Moss & Lantern's page, paper, ink and moss action, with quadrant hues at
Signal's saturation and Signal's vermilion-orange HU. The danger colour
has to change: Moss & Lantern's brick (h34) is four degrees from vermilion
(h38), so the crisis colour becomes Signal's crimson.*

| Token | Light | Dark |
|---|---|---|
| Page | `#F1F3EE` | `#121611` |
| Paper | `#FBFCF9` | `#1B211A` |
| Ink | `#1B2420` | `#ECEDE6` |
| Secondary text | `#5B665E` | `#A2AA9C` |
| Action (moss, deepened) | `#4A5A18` | `#5F7520` |
| Danger (crimson) | `#B01240` | `#F0507A` |
| Field ground (moss night) | `#161B14` | `#161B14` |
| HU vermilion | `#E26E4A` (text `#9C3E1E`) | `#EE8460` |
| HP marigold | `#ECB232` (text `#7A5600`) | `#F2C24A` |
| LU cobalt | `#4F79CC` (text `#2F519F`) | `#7A9BE0` |
| LP green | `#48AE74` (text `#1F6E45`) | `#63C48E` |

Contrast: ink on page 14.2 (dark 15.5); white on action 7.6 (dark 5.2);
white on danger 7.0; quadrant text on tint 5.5 to 6.5 light, 4.7 to 7.1
dark. Hues on moss night 4.1 (cobalt) to 9.1 (marigold); the LU corner's
words should use the dark-theme `#7A9BE0` in both themes. Field midpoints:
top `#EC8F33` (h61), bottom `#009EB4` (h212), left `#B864B1` (h330), right
`#A1B545` (h119).

Does the moss action hold up next to saturated corners? By the numbers,
yes, with a caveat. Moss (h122) is the exact hue of the right edge's
yellow-green midpoint, so the two are distinguished only by lightness
(L0.44 vs L0.74) and chroma (0.09 vs 0.14). That is why the action here
is one step darker than B's `#55671E`: it moves the button toward ink and
away from the field. The risk is aesthetic rather than functional: a dark
olive bar under a screen of marigold and fern can read as the field's
muddy relative. Prototype it on the result screen; if it looks like mud,
the ink button from C2 drops in with no other token change.

On the field: Signal's corners on a warm dark ground instead of black;
the top edge is orange, the left violet, and the whole thing reads as a
lit window rather than a display. On a saved DEAR MAN plan card: B's
notebook paper with one deeper moss bar and a vivid quadrant chip.
Downside: it is the palette with the most moving parts (warm neutrals,
saturated hues, a cool crimson) and the one most likely to look assembled
if any single token is off.

### E. Giverny (from Claudia's references)

*Built 2026-09-14 from two Monet water-lily nail references: one warm
(coral and mint on cream, rose-gold rims, dusty mauve behind) and one cool
(orchid, lily green and lake blue on deep pine water, gold foil). Their
shared structure, not their pixels, is the palette: analogous cools carry
the weight, warm appears as small flecks, shadows go mauve rather than
grey, and the gold is a rim, never a fill. Every token below is generated
in OKLCH from that structure. A first draft sampled the brightest pixel
per hue and was rejected for using the colours without relating them.*

How the colours relate:

- **The four corners are one family.** All four fills sit at L 0.70 and
  the same chroma, 0.145, which is the most the gold hue can hold in sRGB
  at that lightness; the other three are capped to match it. They are as
  vivid as the reference gold allows and no corner shouts over another.
  The dark-theme fills are the same hues at L 0.76, chroma 0.127.
- **Blue holds the LU corner; orchid lives at the seam.** With lake blue
  (h250) in LU, the left edge (coral h35 to blue) blends the short way
  through `#C87ED3`, h322, which is the reference's orchid, and the bottom
  edge blends through `#00B9BE`, the water. With orchid in LU instead, the
  bottom edge (h320 to h145) is a 175-degree gap: one degree from the point
  where OKLCH hue interpolation flips direction and the whole edge turns
  orange. Blue is also the How We Feel convention. Orchid is not lost; it
  is the colour that appears between sadness and anger, which is where
  Monet put it.
- **Neutrals are tints of the palette's own hues.** Ink is pine (h174,
  chroma 0.03), the page is lake water at L 0.97, secondary text is the
  same water hue at L 0.50, and the hairline is mauve (h328) so that the
  only shadow in the system is the one the reference has.
- **The action is the shadow under the lilies.** Deep water, L 0.42,
  chroma 0.066, h178: the darkest colour in the cool painting. It separates
  from the field by lightness (0.42 against corners at 0.70) and chroma
  (0.066 against 0.145), not by hue. It shares a hue region with the bottom
  edge, as D's moss does with the right edge, and that is the honest cost
  of not using purple: on a four-edge field no hue is free, and the
  reference's own dark is the least arbitrary place to stand.
- **Danger is 30 degrees from HU and a lightness step below.** Crimson
  at h5, L 0.50, against coral at h35, L 0.70; it is the lily-pink of the
  reference pushed dark.
- **The gold foil is a token, with one rule.** `#C69E58` may be a hairline
  on the keepsake's edge and the wordmark on a dark ground (7.4:1 on the
  dark page). It is 2.4:1 on light paper, so it is never text there, and
  it is never a fill anywhere. That is what a rim is.

| Token | Light | Dark |
|---|---|---|
| Page (lake water) | `#ECF6F5` | `#0A1615` |
| Paper | `#F9FDFC` | `#152220` |
| Ink (pine) | `#132923` | `#E4EDEC` |
| Secondary text | `#506967` | `#90ABA7` |
| Hairline (mauve) | `#DFD3DE` | `#453943` |
| Action (deep water) | `#1B594D` | `#297163` |
| Danger (lily crimson) | `#A82E57` | `#E97292` |
| Foil (rim and wordmark only) | `#C69E58` | `#C69E58` |
| Field ground (pine water) | `#112621` | `#112621` |
| HU coral | `#EA7A5E` (text `#873B28`) | `#F69279` |
| HP gold | `#CD9200` (text `#754C00`) | `#DBA748` |
| LU lake blue | `#4FA3F4` (text `#1A588F`) | `#6FB6FF` |
| LP lily green | `#5EB663` (text `#26652B`) | `#7BC67E` |

Contrast: ink on page 13.9 (dark 15.5); secondary on page 5.4 (dark 7.5);
white on action 8.1 light, 5.8 dark, and the dark button stands off its
page at 3.2; white on danger 6.6 light, danger on dark page 6.4; quadrant
text on tint 6.3 to 6.9 light, 5.7 to 6.0 dark; light fills on the pine
ground 5.6 to 6.3, so the corner words hold in both themes without a
theme-specific override. Field midpoints (light fills): top `#E08435`
(h57, C0.145), bottom `#00B9BE` (h198, C0.121), left `#C87ED3` (h322,
C0.144), right `#A1A723` (h112, C0.145). No edge dips below chroma 0.12.

On the field: the cool painting. Lake blue and lily green below, coral
and gold above, the water at the bottom seam and the orchid at the left
one, all on pine; the corners glow at the same brightness, so the eye
reads a place, not four signals. On a saved DEAR MAN plan card: near-white
paper on lake-water page, pine type, a mauve hairline, a gold rim at the
keepsake's edge, and one deep-water bar. Downside: this is the palette
most dependent on discipline. The gold rim becomes gaudy the moment it is
used twice on a screen, the mauve hairline reads as a mistake if any grey
border survives elsewhere, and the deep-water action is still a dark
teal-green, which is the neighbourhood Calm, Woebot and today's Goblin
already live in; the pine ink and the four-corner family have to carry
the identity.

## 5. How to choose, and a recommendation

Slate & Spruce and the violet action are out, so the choice is among B,
C2, D and E. Two questions separate them. First, what the field should do
at 8 out of 10: B keeps the corners at a murmur; C2 and D put them at How
We Feel strength with a vermilion top-left; E puts them at one shared
brightness, vivid but even, so the field reads as a place rather than as
four signals. The evidence, weak as it is, and the co-design studies lean
toward B's murmur; the case for stronger corners is that a person with
alexithymia needs four unmistakable regions. Second, where warmth lives:
in the neutrals (B, D), nowhere (C2), or in the flecks against a cool
ground (E).

**Recommendation: E, Giverny, with C2's ink button as the pre-approved
fallback if the deep-water action reads as teal in a prototype.** It is
the only palette derived from a picture Claudia chose rather than from a
brief, and the derivation holds up under the checks that sank the first
draft: one lightness and chroma for the corners, neutrals tinted from the
palette's own hues, a danger colour placed by degrees, a dark theme
derived from the light one, and orchid appearing at the seam because the
geometry puts it there. Its corners are as vivid as D's but even, which
answers both the alexithymia argument and the restraint argument at once.
D remains the choice if the team wants a warm page and the vermilion
top-left specifically; C2 if it wants the cleanest, coldest system; B if
the high-arousal test says even E's corners are too much. That test is
unchanged and should run before anything lands in `index.css`: the result
screen at 8 out of 10, light and dark, with the real headline copy, and
for E specifically, the keepsake with its gold rim beside a primary
button, to see whether the rim survives contact with a real screen.

## Sources

- Buechner, V. L., & Maier, M. A. (2016). Not always a matter of context: direct effects of red on arousal but context-dependent moderations on valence. *PeerJ*. https://pmc.ncbi.nlm.nih.gov/articles/PMC5045874/
- Elliot, A. J. (2015). Color and psychological functioning: a review of theoretical and empirical work. *Frontiers in Psychology*, 6, 368. https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2015.00368/pdf
- Effects of environmental colours in virtual reality: physiological arousal affected by lightness and hue (2023). https://pmc.ncbi.nlm.nih.gov/articles/PMC10565396/
- Garrido, S., Doran, B., Oliver, E., & Boydell, K. (2024). Desirable design: what aesthetics are important to young people when designing a mental health app? *Health Informatics Journal*. https://journals.sagepub.com/doi/10.1177/14604582241295948
- Developing a web-based app to assess mental health difficulties in secondary school pupils (2022). https://pmc.ncbi.nlm.nih.gov/articles/PMC8787665/
- Neuroimaging studies of alexithymia: physical, affective, and social perspectives (2013). https://pmc.ncbi.nlm.nih.gov/articles/PMC3621096/
- Oxford word of the year 2022, "goblin mode". https://www.washingtonpost.com/lifestyle/2022/12/06/goblin-mode-meaning-oxford/
- How We Feel, App Store listing. https://apps.apple.com/us/app/how-we-feel/id1562706384
- Headspace rebrand by Italic Studio, It's Nice That (2024). https://www.itsnicethat.com/articles/italic-studio-headspace-graphic-design-project-250424
- DBT Coach, Resiliens. https://www.resiliens.com/en/dbt-coach
