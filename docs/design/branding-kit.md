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

## 4. Three palettes

Conventions: the field ground is named per palette (it is currently dark
navy in both themes). Quadrant text tokens are used for chip labels on a
10% tint of the hue over paper (light) or the hue itself as text on a 14%
tint over paper (dark). "Field midpoint" is the OKLCH blend of the two
edge hues, to show the edge does not pass through grey.

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
tuned so HU is vermilion-orange rather than red, and a violet action
because purple is the only major hue the four quadrants do not use.*

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

## 5. How to choose, and a recommendation

Pick by asking what the field should feel like at 8 out of 10 and what
the plan card should feel like a week later. A keeps both where they are.
C makes the first vivid and the second crisp, at the cost of the one thing
the research does agree on. B makes the field feel like a place rather
than an instrument and gives the plan card a paper quality the serif is
already asking for.

**Recommendation: B, Moss & Lantern.** It is the only one of the three
that answers the name (a creature of the woods, a light in the dark), the
only one warm without cream and terracotta, and the only one whose action
colour is green without being teal, mint, or emerald. Its HU raspberry is
off pure red, which is the one place the weak evidence and the user
research agree. Two conditions: retheme the field ground from navy to moss
night in both themes so the app does not carry two darks, and prototype
the moss button on the result screen before committing, because that is
where a high-arousal user has to find it. If the team wants minimum churn,
A is the honest fallback and is a two-hour token swap; C should only win
if a test with real users at high arousal shows the vivid corners help
them pick a word faster.

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
