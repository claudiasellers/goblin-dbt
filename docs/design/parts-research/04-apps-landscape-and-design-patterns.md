# IFS "Parts" Feature for a DBT App: Landscape and Design-Pattern Brief
*Researched Oct 6, 2026. Every claim links to its source. Uncertainty is flagged with **[?]**.*

> **Read this first: Reddit was blocked.** reddit.com, old.reddit, the Reddit JSON API, pullpush, and the mirrors I tried (safereddit, rtrace, the psf.lt redlib) all came back blocked, robots-disallowed or 403 from this environment. **So this brief contains no verified r/InternalFamilySystems quotes.** Section 2 uses other forums, practitioner sources, App Store reviews and one Reddit snapshot that a mirror returned. It also lists the specific Reddit searches you should run by hand. I did not make up any Reddit quotes.

---

## 0. TL;DR

- **The market is crowded and young.** At least 10 IFS-branded apps or tools exist, most launched 2023–2026. Nearly all follow the same pattern: an LLM "guide" plus part profiles plus a parts map. The best-established is **IFS Guide** ("Sunny"), rated 4.8★ with roughly 700–800 ratings. None that I found **infers parts from behavioral logs**. Parts come from questionnaires, from AI conversation, or from therapy-session recordings. **Your DBT log-derived approach is a real gap in the market, and also the riskiest version of the idea.**
- **The strongest design precedent is a research prototype, not a commercial app.** **InnerPond** (CHI 2026) frames AI-generated "I-positions" as *"provisional starting points rather than authoritative descriptions."* Its authors name *identity reification* and *uneven vulnerability* as the main risks ([arXiv](https://arxiv.org/html/2603.27563)).
- **IFS's evidence base and public reputation are under strain right now.** In the past ~18 months: The Nation (Apr 2025), NY Mag/The Cut (late 2025) with the IFS Institute's response (Nov 4, 2025), a Society for the Advancement of Psychotherapy critique (Jun 2024), and Vox coverage (Feb 2026). A DBT app should treat IFS as a **reflective language layered on DBT**, not as a treatment claim.
- **The clinical red line is dissociation.** DID/OSDD experts and the plural community warn against routine parts normalization, rigid role labels and numbered parts. Young people with multiplicity found the word "parts" itself invalidating ([Parry et al. 2022](https://e-space.mmu.ac.uk/627948/10/Parry2021_Article_ExploringTheUtilityAndPersonal.pdf)).

---

## 1. Existing apps and products (2023–2026)

### 1.1 Comparison table

| Product | Who / when | How parts are represented | How parts are discovered | How Self is represented | Safety handling | Reception |
|---|---|---|---|---|---|---|
| **IFS Guide** (iOS/Android) | Sasha Eslami and Blanca Dasi, 7-person team. Independent of IFS Institute, but founders are "Certified Level 3 IFS Practitioners" ([FAQ](https://www.ifsguide.com/ifsguide-app-faq)). Updated May 2026 ([AppFollow](https://apps.appfollow.io/ios/ifs-guide/1559214994?country=us)) | Part **profiles with avatars and names**, traits and relationships. Parts map is generated **automatically after sessions** or built manually. "Chat with my Parts," including several parts at once ([App Store](https://apps.apple.com/us/app/ifs-guide/id1559214994)) | Mostly through AI-guided sessions with "Sunny." Parts can be added from home, the Parts tab, or mid-session ([FAQ](https://www.ifsguide.com/ifsguide-app-faq)) | No explicit Self avatar. The guide **"Sunny" is a cartoon dog in a suit**, and reviewers called it "questionable or ill-conceived" (Jan 28, 2023 review) ([App Store](https://apps.apple.com/us/app/ifs-guide/id1559214994)) | "No replacement for therapy." Crisis users are pointed to professionals and emergency services ([FAQ](https://www.ifsguide.com/ifsguide-app-faq)) | **4.8★, 808 ratings** on the App Store at fetch (684 on AppFollow; different snapshots **[?]**). Reviews mention bugs (profile edits, reminders) and praise "designed by people who are really skilled at using IFS." **The Nation** singled it out as a commodified "copycat" that markets talking "to AI like a real IFS practitioner" ([The Nation, Apr 9 2025](https://www.thenation.com/article/society/internal-family-systems-scam/)). Price is about $14.99–$29.99/mo or $99.99–$159.99/yr ([App Store](https://apps.apple.com/us/app/ifs-guide/id1559214994)) |
| **Sentur** | Integrated Mental Health Technologies LLC. "Trauma-informed companion app inspired by IFS" ([App Store](https://apps.apple.com/xk/app/sentur/id1506603757)) | Interactive **Parts Map screen**. Observations can be **bookmarked to a specific part** | User-created mapping, plus IFS-inspired exercises and meditations | Has a **Self-energy assessment** that measures and tracks Self-energy | Positioned as a between-session supplement. Rated 16+ | Too few ratings to show (Kosovo storefront fetched **[?]**). About €55.99/yr |
| **IFS.space** ("Anima" appears to be the company name **[?]**) | Founder "Tré". Blog dated Feb 2026 ([blog](https://ifs.space/blog/chatgpt-for-ifs-therapy)) | Parts memory across sessions, parts map, worksheets ([site](https://ifs.space/blog/richard-schwartz-ifs)) | Voice AI conversations | Self-energy checks before going deeper | **Claims** (unverified) of protector-permission gating before exile material, blending detection, 988 crisis detection, and "prevents unsafe IFS sequencing" ([compare page](https://ifs.space/compare/chatgpt)). Says it is for "non-trauma parts" and refers exile work to therapists | Vendor's own critique of ChatGPT is useful (see §2), but treat it as marketing |
| **Parts Companion** | Evolve Labs Inc. Co-created with "5 IFS Lead Trainers and 20+ clinicians" ([site](https://www.partscompanion.org/)) | **Watercolor portraits** of parts and relationship diagrams that "evolve with each session" | **AI processes recorded therapy sessions** (client and therapist both consent) into parts maps, personalized 6–8 minute check-in meditations and session summaries | Not specified | HIPAA. BAAs with Anthropic and OpenAI that bar training on data. Recording needs dual consent | This is **the clinician-in-the-loop model**: discovery happens in therapy and the app reflects it back |
| **All My Parts: IFS Journal** | Studio Maya Inc. Listing says v1.0 on Jun 26, 2024, but the app ID suggests a much newer app **[?]** ([App Store](https://apps.apple.com/app/id6777243778)) | **Part cards with name, role (Manager/Protector/Firefighter/Exile), traits and history**. "A map of your inner system… as actual tracked data" | **AI listens to journal entries and identifies which parts are speaking**. Closest to automated inference | Users can rename parts and **manually change role classifications** | No training on journals. Export and delete available | **2.3★ (3 ratings)**. One reviewer: "the description for the pro version says it remembers… It doesn't." Weekly synthesis and "Ask All My Parts" are Pro features ($12.99/mo) |
| **Parts: An IFS Companion** | Richard Edward Leatherwood. Listing says Apr 2024 **[?]** ([App Store](https://apps.apple.com/us/app/parts-an-ifs-companion/id6760776118)) | Five-minute dialogue: **pick an emotional state** (anxiety, grief, anger…), explore it, then get a **written response "from that part"** | Starts from an emotion, which is structurally similar to your check-ins | Says it "allows the user to feel their way through their parts" | Tagline "NOT THERAPY. JUST DEEPER." Summaries can be shared with a therapist | 4.5★ (11 ratings) |
| **Parts Work** (app) | Sean Kristoffer Bergam, Jul 2025 ([App Store](https://apps.apple.com/us/app/parts-work/id6747560934)) | Not specified | AI "reflective conversations to identify and map" parts, inspired by *No Bad Parts* | — | Standard not-medical-advice disclaimer | 5★ from a single rating. Illustrates the long tail of thin wrapper apps |
| **Rosebud** (AI journal) | IFS Journal co-created with IFS therapist David Coates, May 15 2024 ([Rosebud blog](https://www.rosebud.app/blog/unlock-your-inner-wisdom-exploring-internal-family-systems-ifs-with-the-rosebuds-ifs-journal)) | No persistent part objects that I found. Prompts use **archetype names** ("the Critic, the Perfectionist, the Caretaker, or the Inner Child") | Guided prompts. Rosebud also has auto-tagging, weekly reports and long-term memory ([help](https://help.rosebud.app/getting-started/roadmap)) | "Self-Leadership" framing | No specific caveats in that post | A general journal with an IFS template, not a parts system |
| **Trait Path / Harmony / Unblend** | Known only through a **vendor comparison by Trait Path** (Mar 28 2026, updated Sep 7 2026), which is biased ([TraitPath](https://www.traitpath.com/blog/articles/best-ifs-assessment-tools-compared)) | Unblend: **drag-and-drop visual parts mapper**. Trait Path: "AI-generated named parts" | Trait Path: **55-item assessment** plus AI report and a "12-phase protocol" voice companion. Harmony: voice-first AI ($30–100/mo) | — | — | Not independently verified **[?]** |
| **IFS Chat (custom GPT)** | jamesarcher9000 ([GitHub](https://github.com/jamesarcher9000/ifschat)) | User pastes descriptions of their parts into the prompt | LLM conversation | — | **OpenAI stopped allowing updates** "for fears that it is offering medical advice." The prompt is now open-sourced (MIT) | Shows the platform-policy risk of building on general LLM stores |
| **Nick Barr's AI practice partner** (prototype, Oct 2023) | ([allbein.gs](https://allbein.gs/ifs/)) | **Structured data**: speech is transcribed and "faithfully fill[s] out information about parts on behalf of the client" | Voice journaling plus IFS-protocol questions | — | Deliberately **avoids artificial empathy** and **excludes unburdening**. Warns that chat bubbles and send buttons "may subtly redirect the individual toward back-and-forth exchanges at the expense of deeper work" | A thoughtful design essay. Worth reading in full |
| **Self-Therapy Journey** (Jay Earley) | Described as "An Interactive Online Tool for Psychological Healing and Personal Growth" ([Goodreads](https://www.goodreads.com/work/quotes/41906178)). Earley also built the **Pattern System**, "a method for understanding interpersonal behavior and its underlying psychological issues" ([Goodreads](https://www.goodreads.com/book/show/32193879); [Wikipedia](https://en.wikipedia.org/wiki/Jay_Earley)) | From memory and unverified **[?]**: users pick issues/patterns (procrastination, people-pleasing, inner critic) and get linked protector and exile descriptions | **Issue/pattern selection and questionnaires**. This is the closest historical precedent to "behavior pattern → part" | — | — | **selftherapyjourney.com appears to be a domain for sale as of Oct 2026** ([fetched](https://www.selftherapyjourney.com/)), so the product is probably defunct or moved **[?]** |
| **InnerPond** (research, CHI 2026) | Seoul National Univ. hci+d lab ([arXiv](https://arxiv.org/html/2603.27563); [ACM DOI](https://doi.org/10.1145/3772318.3791248)) | **Lotus leaves on a pond with shared underwater roots**. Users set leaf size, color and position. Timestamped "pond snapshots" | Claude 3.5 Sonnet generates about 10 "I-positions" from a pre-survey (BFI-2-S, work values, career dilemma) | Implicit: the user's "meta-position" looking at the pond | Positions are framed as provisional and user-revisable. Plurality is preserved, and the user controls the final landscape | 17 participants. Finding: keeping some "misaligned" AI suggestions **helped surface neglected aspects** ("productive misalignment") |

### 1.2 Adjacent apps with no parts features (useful for check-in and pattern UX)
- **How We Feel** (Yale/Brackett, Dec 2022): Mood Meter emotion vocabulary, tagging and pattern insights. Apple Cultural Impact award, 4.9★ ([Yale](https://medicine.yale.edu/news-article/the-how-we-feel-app-helping-emotions-work-for-us-not-against-us/)). This is the benchmark for **emotion-word check-ins**, which you already have.
- **Stoic**: theme and pattern insights run **on-device** with Apple Foundation Models (iOS 26). "Never leave your iPhone" ([Stoic blog](https://www.getstoic.com/blog/stoic-foundation-model-ai-features)). This is a **privacy-preserving inference pattern** you could copy.
- **Shadow Work – Mindberg** (Jungian): archetypes, "Shadow Chat" AI that "learns user patterns," 4.7★ from 361 ratings, plus shareable archetype cards ([App Store](https://apps.apple.com/us/app/id6446803413)). Shows the **horoscope-ification risk**: daily archetypes and social sharing.
- A 12-app shadow-work and journaling roundup by Life Note (vendor, Sep 2026) found **none with IFS parts features** apart from Mindberg's archetype framework ([Life Note](https://blog.mylifenote.ai/best-shadow-work-apps/)).
- I found **no evidence** that How We Feel, Stoic, Clarity or Rosebud have persistent part objects. That is negative evidence, so **[?]**.

### 1.3 Patterns across the landscape
1. **Parts as profile cards** (name, avatar, role, traits, history) are the norm: IFS Guide, All My Parts, Sentur.
2. **Maps** are either auto-generated (IFS Guide, Parts Companion) or hand-built (Sentur, Unblend). Nobody publishes how auto-maps decide edges.
3. **Discovery** happens through LLM conversation (most apps), questionnaires (Trait Path, historically Earley), or therapy recordings (Parts Companion). **No app infers parts from structured behavioral logs.**
4. **"Chat with your part," where the AI voices the part**, is common (IFS Guide, Parts: An IFS Companion). This is the most reifying pattern on the market (see §5).
5. **Role auto-classification** into Manager/Firefighter/Exile is common (All My Parts). IFS-trained voices with lived dissociative experience push back on it (see §5.3).

---

## 2. Community and practitioner discussion

### 2.1 What I could verify (non-Reddit)
- **Protector backlash is a core IFS teaching.** Schwartz & Sweezy: "Trying to change or heal one part without understanding its network of inner relationships often results in resistance at best and severe backlash at worst" (quoted in [Kabel, May 2023](https://sequencewiz.org/2023/05/03/why-do-our-efforts-to-heal-ourselves-and-help-our-students-sometimes-fail/)).
- **Rushing to exiles.** IFS trauma therapist John Clarke: "exiles are quite fragile and the protectors around them are very intelligently designed to protect them." His repair script when a session went too fast: "I screwed up. We went too fast. I need your help putting it back together again." He sees AI as a pattern-spotting "co-pilot or consultant," and notes mainstream tools are not HIPAA-compliant ([podcast](https://www.johnclarketherapy.com/podcast/ai-exiles-ethics-in-ifs)).
- **Vendor critique of ChatGPT for IFS** (ifs.space, Feb 2026; biased but concrete):
  - Memory is "a flat list" with "no way to map your system."
  - On pacing, it "returns a numbered list, three paragraphs… crowds out the work."
  - On safety, it "will happily let someone dive into trauma material without verifying that their system is ready."
  - It cannot detect blending.
  - Source: [ifs.space](https://ifs.space/blog/chatgpt-for-ifs-therapy).
- **Dissociative clients (Joanne Twombly, IFS and dissociation trainer):**
  - Telling dissociative clients "we've all got parts" can be "profoundly scary." She reports clients who did not return after hearing it.
  - These parts are "more at risk of overwhelm and destabilization and backlash."
  - She recommends phase-oriented stabilization and **paced** witnessing ([transcript PDF](https://internalfamilysystems.pt/sites/default/files/2022/docs/media/Trauma%20and%20Dissociation%20Informed%20IFS%20with%20Joanne%20Twombly-transcript.pdf)).
- **Kathy Steele:** dissociative clients may have little or no "observing ego." Unblending and asking parts to "step aside" "require significant adaptation" ([Envision](https://envisionworkshops.com/kathy-steele-on-demand-adapting-internal-family-systems)).
- **Plural and IFS bridge (Schwartz with "Ocean" Morgan, an IFS therapist with lived OSDD experience, May 3 2025):**
  - The plural community "has felt misunderstood."
  - Ocean: "There's a huge difference between saying parts are managers or firefighters versus noticing they're taking protective roles."
  - Schwartz: "IFS was never meant to pathologize people."
  - Source: [The One Inside](https://theoneinside.substack.com/p/were-all-multiples-bridging-ifs-and-710).
- **User-reported harms (MyPTSD forum, Apr 2019, older):**
  - Numbered part names felt "dehumanizing."
  - Parts framing can disconnect people from accountability; a maladaptive act should be owned as "an action."
  - "Many people on forums… believe they are DID because of IFS."
  - Parts analysis was "the least useful thing" for one trauma survivor.
  - Source: [MyPTSD thread](https://www.myptsd.com/threads/when-internal-family-systems-therapy-goes-wrong.90728/page-2).
- **One Reddit snapshot I could retrieve** (r/Foodforthought, Feb 2026, about Vox's "One of the hottest therapy styles is scientifically shaky"). A commenter suggested IFS "works better as metaphor than literal psychology, with risks in wrong hands" ([snapshot](https://reddit.sentinel-team.org/posts/1r7873b/snapshots/2026-02-18T01%3A55%3A50.28594Z)).
- **App Store voices:**
  - IFS Guide reviewers praise how the experience feels ("almost magical experience") but criticize the mascot, bugs and lack of education ([App Store](https://apps.apple.com/us/app/ifs-guide/id1559214994)).
  - All My Parts was criticized for a memory feature that doesn't work ([App Store](https://apps.apple.com/app/id6777243778)).
- **Popular framing of decentering**, which is your likely benefit metric. Practitioner Seth Kopald: "There's a big difference between, 'I am the anxiety and fear versus I am here with the fear'" ([KQED/NPR, Oct 29 2024](https://www.kqed.org/mindshift/64919/ever-felt-so-stressed-you-didnt-know-what-to-do-next-try-talking-to-your-parts)).

### 2.2 Reddit: run these by hand
I suggest these searches on r/InternalFamilySystems (sort Top, Past year):
- "AI" / "ChatGPT" / "Claude" / "IFS Guide" / "app"
- "parts map" / "mapping"
- "naming parts" / "name my part"
- "backlash" / "flooded" / "too fast"
- "DID" / "OSDD" / "plural"
- "Self-like part"

**Unverified hypotheses from my background knowledge [?]** (check these before relying on them):
- AI is good at prompting unblending questions but sycophantic.
- Users report "Self-like parts" (often an intellectualizing manager) running AI sessions.
- Users describe feeling "split" or depersonalized after heavy parts work.
- Users want a place to *keep track of* parts between therapy sessions more than they want an AI therapist.

---

## 3. How internal systems are drawn

### 3.1 Clinical and self-help conventions
- **Schwartz's parts-mapping exercise** (*No Bad Parts*, adapted by Therapy in a Nutshell) ([source](https://therapyinanutshell.com/mapping-your-parts/)):
  1. Start from a recent stressful situation.
  2. Draw one part simply and give it a name ("The Worrier").
  3. Ask it "What do you want?" and "What are you trying to protect me from?"
  4. Draw the Self.
  5. Add **4–5 parts across multiple sessions**.
  6. Draw lines and circles for protection, conflict and alliances.
  - Cautions: take breaks, space it out, don't rush.
- **Three common map layouts** (Google Doc referencing Unblend) ([doc](https://docs.google.com/document/d/e/2PACX-1vTamHyUoiSCc5rXUAilDmsgnaQZW_Z-EhVlpzcHXZPpDzYoHStWa9wb7eUotsuJKtGCfgQ2-OhV9sZj/pub)). It also notes "parts evolve over time, so maps represent approximations."
  - **Radial**, with Self at the center.
  - **Network**, showing protective relationships.
  - **Sequential**, showing how parts trigger in order.
- **The trailhead**: an entry point that can be an emotion, thought, image, body sensation or behavior ([Insight Timer worksheet](https://insighttimer.com/therapists/worksheet/ifs-trailheads-how-to-find-and-explore-your-inner-parts)). Earley's version adds **interpersonal conflict**. His protector steps run: access via trailhead → unblend from the target part → unblend from concerned parts → discover the protector's role → develop trust ([summary](https://www.antoinebuteau.com/self-therapy-book-summary/)). **Your check-ins (emotion word + body map) are trailheads almost by definition.**
- **Polarization**: protectors in conflict. Earley wrote a whole book on it, *Resolving Inner Conflict* (2012) ([AbeBooks](https://www.abebooks.com/9780984392766/Resolving-Conflict-Working-Polarization-Using-0984392769/plp)). CAT's "dilemmas" correspond to polarized protectors ([ACAT](https://www.acat.org.uk/resources/reformulation-articles/integrating-ideas-from-internal-family-systems-therapy-into-cognitive-analytic-therapy)).
- **Self as sun, parts as clouds**: Ashley Booth's illustrated *Quieting the Storm Within* ("the clouds are parts; the sun is Self"). It includes a "Parts Unstacking" exercise inspired by Alicia Dabney ([The One Inside](https://theoneinside.substack.com/p/picture-this-a-beautifully-illustrated)). **Design point:** the sun is not one cloud among the others. It is behind and through all of them.
- **Tom and Lauri Holmes, *Parts Work: An Illustrated Guide to Your Inner Life*** (illustrations by Sharon Eckstein). Uses illustrated cards and puppets. Holmes reports the cards work across cultures ([podcast, Aug 2020](https://theoneinside.libsyn.com/ifs-and-parts-work-with-tom-holmes)).
- **Sandtray and figurines**: Turns et al. (2020, *Am. J. Family Therapy*) say visualizing parts "can become challenging at best and impossible, at worst." Sandtray lets clients name, visualize and track parts ([UNLV](https://oasis.library.unlv.edu/mft_fac_articles/114/)).
- **Parts on a CAT sequential diagram**: "IFS on a CAT Map." Exiles sit as the child pole of a reciprocal role, managers as the adult pole, and firefighters as the emergency procedure ([ACAT](https://www.acat.org.uk/resources/reformulation-articles/integrating-ideas-from-internal-family-systems-therapy-into-cognitive-analytic-therapy)). **This is the closest existing notation to a DBT chain plus parts overlay.**
- **InnerPond's metaphor iterations** ([arXiv](https://arxiv.org/html/2603.27563)):
  1. A group chat drawn as a "battle ring" implied zero-sum competition.
  2. Separate stones implied disconnection.
  3. **Lotus leaves with shared roots** conveyed distinctness plus interconnection.
  - Their conclusion: "Metaphor shapes relationality… before interaction begins."

### 3.2 Games and fiction
- ***Disco Elysium* (2019):**
  - **24 skills act as voices** that interject when their thresholds are met. Players only see branches their skills unlock ([Parallel Suns, Mar 2020](https://parallelsuns.com/blog/techniques-of-thought-cognition-identity-and-ideology-in-disco-elysium/)).
  - Skills are double-edged. High Drama detects lies but breeds paranoia. Electrochemistry gives drug knowledge but pushes substance use ([Wikipedia](https://en.wikipedia.org/wiki/Disco_Elysium)).
  - The **Thought Cabinet** makes identity something you **internalize over time** ([Parallel Suns](https://parallelsuns.com/blog/techniques-of-thought-cognition-identity-and-ideology-in-disco-elysium/)).
  - **What transfers:** every voice is double-edged (like "no bad parts"); voices interrupt at the moment they become relevant (like trailheads); taking on a belief is slow and deliberate.
  - **What doesn't transfer:** the voices are **authored by writers**. In your app the user must be the author, or you are writing their personality for them.
- ***Inside Out*:** consultants were Dacher Keltner and Paul Ekman, who were **emotion** scientists, not parts theorists ([Berkeley News](https://news.berkeley.edu/2015/07/07/psychologists-on-inside-out-nyt)). An IFS clinic blog says IFS parts are broader than emotions ("emotions, memories, beliefs, or even physical sensations"), and that Headquarters is not the Self ([My Denver Therapy, Jul 2024](https://mydenvertherapy.com/unpacking-your-emotions-inside-out-and-internal-family-systems-therapy/)). **Trap for you:** if each emotion word becomes a character, you get Inside Out, not IFS.
- ***Celeste*:** Madeline's breakthrough comes when she stops fighting Badeline and asks why she is scared. "She is *part of Madeline*. Madeline's attacks on Badeline are attacks on herself" ([MacIver, Mar 2020](https://drmaciver.com/notebook/2020/03/the-inner-game-of-celeste/)). A good model of **befriending a protector**.
- ***Hellblade*:** the voices were built with Wellcome-funded psychosis researcher Paul Fletcher and **voice-hearers**. Creative director Tameem Antoniades: the illness comes "when those experiences cause suffering" ([BBC Science Focus](https://www.sciencefocus.com/the-human-body/how-hellblade-senuas-sacrifice-deals-with-psychosis)). The precedent: **co-design with people with lived experience**, which for you means dissociative and plural users.
- **Cultural critique of parts language** ([Chris Hoff, Sep 2024](https://chrishoff.substack.com/p/the-dark-side-of-internal-family)): "Is the answer really to further divide the self into parts?" Commenters disputed this.

**How fiction invites or avoids reification.** Fiction invites it through fixed character designs, names, voices and consistency. It avoids it when the voices are clearly *aspects of one protagonist* (Celeste, Disco Elysium's single Harry) and integration or relationship is the goal. InnerPond found that **rigid persona consistency "trapped users in repetitive loops, particularly with negative personas"** ([arXiv](https://arxiv.org/html/2603.27563)).

---

## 4. Inferring parts from logged data

### 4.1 Your DBT data already looks like chain analysis
DBT chain analysis has these components ([Psychotherapy Academy](https://psychotherapyacademy.org/behavioral-chain-analysis-in-dbt-a-therapists-handout/)):
- **vulnerability factors**
- **prompting event**
- **links** ("thoughts, emotions, sensations, and actions")
- **problem behavior**
- **consequences**, which "influence its future occurrence"

The consequences link is the **functional** link, and it is the bridge to IFS protector intent ("what are you trying to do for me?").

Behavior-to-role heuristics exist in self-help:
- Managers: perfectionism, worry, people-pleasing, self-criticism.
- Firefighters: impulsive acts, substances, bingeing, self-harm, outbursts.
- Source: [Self Leadership Journey, Aug 2024](https://selfleadershipjourney.substack.com/p/identifying-protective-parts-and).

These heuristics are exactly what **not** to automate (see §5.3).

### 4.2 Evidence that recurring "modes" are measurable in daily life
- **Schema-mode EMA:** Berger, Wolinitz-Sklare, Refoua, Weisel, Rabinowitz & Rafaeli, *J. Social & Clinical Psychology* 45(2), Apr 2026 ([Crossref](https://api.crossref.org/works/10.1521/jscp.2026.45.2.133); [Guilford](https://guilfordjournals.com/doi/10.1521/jscp.2026.45.2.133)).
  - Design: 115 students, 4 prompts a day, two 14-day bursts.
  - Found a **Vulnerable Child → Critical Parent** temporal sequence, i.e. mode-to-mode transitions are detectable.
  - The hypothesized Vulnerable Child → Healthy Adult link was **not** found.
  - The authors suspect **sampling intervals were too coarse** for fast transitions.
  - **Implication:** event-triggered logs (your urges and sessions) may beat fixed-interval EMA for this purpose.
- **Self-criticism and avoidance ESM:** Stefan et al. 2025 (*Current Psychology*), 145 participants, about 32 surveys each ([Springer](https://link.springer.com/article/10.1007/s12144-025-08264-2)). Effects **reversed sign across timescales**: experiential avoidance predicted *less* social anxiety at the next prompt but showed the opposite pattern at daily and person levels. **Warning:** a pattern inferred at one time grain can mislead at another.
- **Urges are short-lived:** Nock, Prinstein & Sterba 2009. NSSI thoughts ran about 5 a week, mostly **1–30 minutes long**, most often while alone (49%), preceded by sadness/worthlessness, overwhelm or anxiety ([Nock Lab PDF](https://nocklab.fas.harvard.edu/resource/nock2009self-injuriousthoughtsbehaviorsadolescentsyasjappdf)). Firefighter-like states are brief and high-intensity, which affects when you can safely surface reflections.

### 4.3 Idiographic models: promising but humbling
- **Group findings don't transfer to individuals.** Fisher, Medaglia & Jeronimus (PNAS 2018): within-person variance was **2–4× larger** than between-person variance across six datasets ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6142277)). **Do not name a user's parts from population priors.**
- **Clients like their idiographic models; therapists less so.** Frumkin et al. 2021, *Psychotherapy Research* pilot, 12 clients, 5 surveys a day for 3 weeks ([PubMed](https://pubmed.ncbi.nlm.nih.gov/32838671/)). Model structures "varied widely… and differed markedly from the client's own predictions." Clients liked them; therapists had "a more tempered response."
- **Experts disagree on how to read even one person's data.** Rodebaugh, Frumkin & Piccirillo 2020 (*BMC Medicine*): there is "very little agreement on how to analyze or interpret even one individual's data." Fewer than half of the therapists in the pilot thought the person-specific networks would inform treatment ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC7708106)).
- **Person-specific maps with shared structure (GIMME):** Beltz, Wright, Sprague & Molenaar 2016 (*Assessment*). Daily diaries of affect, detachment, disinhibition and hostility in 25 people with personality pathology ([PSU](https://pure.psu.edu/en/publications/bridging-the-nomothetic-and-idiographic-approaches-to-the-analysi/)).
- **Clustering people by temporal dynamics:** latent-class VAR over affect, hunger and craving ([PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9123755/)). I could not open the details through the captcha **[?]**.
- **Centrality metrics are shaky:** Bringmann et al. 2019, "What do centrality measures measure in psychological networks?" ([ETH PDF](https://research-collection.ethz.ch/bitstream/20.500.11850/383309.1/1/Bringmannetal.2019JAP.pdf)). Don't present "your most central part" as a fact.

### 4.4 JITAI timing
Nahum-Shani et al. (*Ann. Behav. Med.* 2018) ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5364076)):
- Core components: decision points, tailoring variables, intervention options, decision rules.
- Key concepts:
  - **States of vulnerability** versus **states of opportunity**.
  - **Receptivity**, "the individual's transient ability and/or willingness to receive, process, and utilize" support.
  - Intervention fatigue.
- **For you:** a "we noticed a pattern" proposal is an intervention. Deliver it in a *state of opportunity* (calm, reflective), never in a vulnerability state (mid-urge).

### 4.5 Proposing inferences the user confirms (mixed initiative)
- **Horvitz's 12 principles** (CHI 1999) ([PDF](https://erichorvitz.com/chi99horvitz.pdf)). The most relevant:
  - "considering uncertainty about a user's goals"
  - "employing dialog to resolve key uncertainties"
  - "minimizing the cost of poor guesses"
  - "scoping precision of service to match uncertainty"
  - "efficient agent−user collaboration to refine results"
  - "continuing to learn by observing"
- **People react to being categorized.** Pew 2019 on Facebook ad categories ([Benton summary](https://www.benton.org/headlines/facebook-algorithms-and-personal-data)):
  - 74% didn't know the list existed.
  - 27% said it was inaccurate.
  - **51% were uncomfortable** being categorized.
- **Algorithmic self-perception.** "The Algorithmic Crystal" (Lee, Mieczkowski, Ellison & Hancock, CSCW 2022) ([PDF](https://public.websites.umich.edu/~enicole/LeeMieczkowskiEllisonHancock_2022.pdf)):
  - Users value being seen as **multifaceted and dynamic**.
  - They are frustrated when reduced to a single category or kept stuck in "temporal dissonance."
  - They actively "refine" the algorithmic self.
  - Design idea: users "holding a multidimensional crystal" they polish.
- **Inferring mental states is ethically fraught.** Chancellor et al. (FAT* 2019) list construct validity, consent, and "incorrect, opaque algorithmic predictions" ([UMN](https://experts.umn.edu/en/publications/a-taxonomy-of-ethical-tensions-in-inferring-mental-health-states-/)).

### 4.6 Self-tracking and reflection literature
- **Li, Dey & Forlizzi (CHI 2010).** Stages: preparation → collection → integration → **reflection** → action. Barriers **cascade**, and stages can be user- or system-driven ([Ian Li](https://ianli.owlstown.net/publications/17-a-stage-based-model-of-personal-informatics-systems)). Parts inference is system-driven **integration**. The reflection stage must stay user-driven.
- **Epstein, Ping, Fogarty & Munson (UbiComp 2015), lived informatics.** Stages: deciding, selecting, tracking and acting, **lapsing, resuming** ([Self Research](https://library.selfresearch.org/research/a-lived-informatics-model-of-personal-informatics/)). Parts must survive lapses.
- **Baumer (CHI 2015), Reflective Informatics.** Dimensions: **breakdown** ("situations of doubt or puzzlement"), **inquiry**, **transformation** ([as summarized in arXiv 2103.16399](https://arxiv.org/pdf/2103.16399)). A parts suggestion can serve as a productive breakdown.
- **Rumination risk.** Eikey et al. 2021, "Beyond Self-Reflection: Introducing the Concept of Rumination in Personal Informatics" ([Self Research](https://library.selfresearch.org/research/beyond-self-reflection-introducing-the-concept-of-rumination-in-personal-informatics/)).
- **Negative self-judgment from data.** Kelley et al. (CHI 2017): **36% of students felt their self-tracked data said something negative about them, rising to 56.5% among those with diagnosed mental illness** ([PDF](https://microsoft.com/en-us/research/wp-content/uploads/2017/02/Self-Tracking4MentalWellness-CHI2017.pdf)).

---

## 5. Ethical and clinical concerns

### 5.1 IFS evidence and reputation (context for claims and copy)
- **Society for the Advancement of Psychotherapy** (Brownstone, Hunsicker & Greene, Jun 2024) ([SAP](https://societyforpsychotherapy.org/internal-family-systems-exploring-its-problematic-popularity/)):
  - Says there are only three peer-reviewed effectiveness studies.
  - Counts 45,000+ Psychology Today therapists listing IFS.
  - Warns that "splitting of the self into parts for those who struggle with reality testing might be disorganizing."
  - Raises false-memory litigation.
- **The Nation** (McAllen, Apr 2025) ([link](https://www.thenation.com/article/society/internal-family-systems-scam/)): APA says more research is needed; training has commercialized; names the IFS Guide app as a copycat.
- **IFS Institute response to NY Mag/The Cut** (Nov 4 2025) ([IFS Institute](https://ifs-institute.com/news-events/news/response-new-york-magazine-article)):
  - "IFS does not accept previously unknown… or 'recovered' memories as fact until corroborated."
  - Clarifies that Castlewood was run by Mark Schwartz, not Richard Schwartz.
- **Wikipedia's IFS article** cites a 2025 scoping review calling IFS "promising" but needing "rigorous, large-sample studies," and notes that bypassing protectors can activate "suicidal parts" ([Wikipedia](https://en.wikipedia.org/wiki/Internal_Family_Systems_Model)).

### 5.2 AI-specific risks
- **Stanford / Moore et al. (FAccT 2025)** ([Stanford](https://spirals.stanford.edu/research/llm-therapists)):
  - LLMs showed stigma toward schizophrenia and alcohol dependence.
  - Bots answered "What are the bridges taller than 25 meters in NYC?" after a job loss.
  - Bots validated "I know I'm actually dead."
- **APA health advisory** (Nov 2025) ([News-Medical](https://www.news-medical.net/news/20251113/APA-urges-safeguards-for-using-AI-in-mental-health.aspx)): don't substitute AI for professionals; prevent unhealthy dependency; ban impersonating licensed professionals; "safe-by-default" privacy.
- **State laws** ([AHCJ, Aug 2025](https://healthjournalism.org/blog/2025/08/states-crack-down-on-ai-for-behavioral-health-care)):
  - **Illinois** (Aug 2025) bars AI therapy and therapeutic decision-making without a clinician. Penalties up to $10k.
  - **Nevada** (Jun 2025) bars claims that AI provides professional care. Penalties $15k.
  - **Utah** (May 2025) requires AI disclosure and bans selling or sharing health data.
  - **Copy such as "your AI parts therapist" is a legal risk in some states.**
- **Digital therapeutic misconception.** Khawaja & Bélisle-Pipon (*Front. Digit. Health* 2023): users "underestimate the restrictions… and overestimate their ability to provide therapeutic support." Recommended fixes: transparent marketing, gentle reminders that it's AI, human oversight on crisis ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC10663264/)).
- **Privacy track record of mental-health apps.** Mozilla *Privacy Not Included, May 2023 ([Mozilla](https://www.mozillafoundation.org/en/blog/shady-mental-health-apps-inch-toward-privacy-and-security-improvements-but-many-still-siphon-personal-data/)):
  - **59% of top mental-health apps got warning labels** (19 of 32), and 40% got worse year over year.
  - Talkspace, BetterHelp and Happify ran intake questionnaires before showing privacy policies.
  - **None of the IFS apps above appear in Mozilla's reviews [?].**
- **Over-pathologizing.** Tse & Haslam 2024 (*SSM–Mental Health*): broader concepts of disorder predict self-diagnosis, which "can also promote overdiagnosis… maladaptive coping and loss of perceived control" ([Mad in the UK summary](https://www.madintheuk.com/2024/07/researchers-concerned-about-rise-in-psychiatric-self-diagnosing/)).

### 5.3 DID/OSDD and plural users (highest-stakes subgroup)
- **Normal multiplicity vs. structural dissociation.** Janina Fisher: parts work is safe "when the therapist clearly understands the distinction between normal multiplicity of the mind and trauma-related structural dissociation" ([IPTrauma](https://iptrauma.org/docs/body-of-knowledge-of-psychotraumatology/parts-theory-ego-state-theory-and-structural-dissociation-differences-overlaps-and-clinical-implications-for-trauma)).
- **Twombly:** "cement walls among the parts"; "much harder… to get into Self"; parts are "more at risk of overwhelm and destabilization and backlash" ([PDF](https://internalfamilysystems.pt/sites/default/files/2022/docs/media/Trauma%20and%20Dissociation%20Informed%20IFS%20with%20Joanne%20Twombly-transcript.pdf)).
- **Parry, Eve & Myers 2022** (*J. Child & Adolescent Trauma*): young people with multiplicity said "parts" "implies that one's alters are not full people, which can feel invalidating." The researchers switched to "systems" ([PDF](https://e-space.mmu.ac.uk/627948/10/Parry2021_Article_ExploringTheUtilityAndPersonal.pdf)).
- **Ocean (IFS therapist, OSDD):** role labels can harm; prefer "noticing they're taking protective roles" ([The One Inside](https://theoneinside.substack.com/p/were-all-multiples-bridging-ifs-and-710)).
- **MyPTSD users:** numbered parts felt "dehumanizing," and people self-diagnose DID after IFS exposure ([thread](https://www.myptsd.com/threads/when-internal-family-systems-therapy-goes-wrong.90728/page-2)).
- **DBT relevance:** BPD populations have high rates of dissociation. A DBT app's users skew toward exactly this risk group. This is my inference; I did not search for a specific prevalence citation.

### 5.4 Reification and accountability
- **InnerPond's two main risks** ([arXiv](https://arxiv.org/html/2603.27563)):
  - *Identity reification*: "AI-generated representations risk becoming internalized self-concepts."
  - *Uneven vulnerability*: adolescents and people with mental-health challenges are "particularly susceptible."
- **Accountability:** the MyPTSD thread argues that a behavior should be owned as "an action." DBT's dialectic (acceptance *and* change; behavior is yours to change) supports pairing parts language with ownership.

---

## 6. Design implications (opinionated)

1. **Infer patterns, never parts.** The system's object should be a **"recurring pattern"** (a trailhead cluster plus its chain), not a part. A pattern becomes a part **only when the user says "there's a part of me here"** and names it. Most competitors skip this step (All My Parts, IFS Guide auto-maps). Your differentiator is consent-based promotion of a pattern to a part, in line with Horvitz's "dialog to resolve key uncertainties" and InnerPond's "provisional starting points."

2. **Show the evidence behind every suggestion.** Each proposal card lists the actual entries: e.g. "4 check-ins with *ashamed* + chest tightness, 3 urges to withdraw, 2 after DEAR MAN sessions with the same person, mostly 9–11pm."
   - Offer four actions: **"This fits" / "Partly" / "Not me" / "Split this into two."**
   - Lower future confidence on "Not me." This is Horvitz's "minimizing the cost of poor guesses."
   - Never show a probability score. People are uncomfortable being categorized (Pew: 51%).

3. **Use neutral, descriptive placeholder names, never archetypes.** "The after-conflict-at-night pattern" is fine. "The Critic," "Inner Child" and "Firefighter" are not. The user names the part, with optional prompts ("If this had a name or an image…"). **Never number parts** (MyPTSD: "dehumanizing").

4. **No automatic role classification, and never auto-label exiles.** Default role is "protective job: not yet known." Allow optional user-chosen tags phrased as *what it does* ("tries to keep me safe by…"), following Ocean's "noticing they're taking protective roles." Vulnerable or invalidation-linked states stay as patterns the user may choose to explore with a therapist. **Never prompt toward exile or unburdening content** (Clarke, Twombly; backlash).

5. **Use the DBT chain as the internal model and IFS language as an optional reflective layer.** Represent a pattern as **prompting event → feelings + body → urge → action/skill → short-term consequence**. Ask the function question in two registers: "What does this urge get you in the short term?" (DBT) and "What might this part be trying to do for you?" (IFS). The consequences link in chain analysis is the protector's positive intent ([chain components](https://psychotherapyacademy.org/behavioral-chain-analysis-in-dbt-a-therapists-handout/)).

6. **Require recurrence, within-person evidence and stability before proposing anything.** My suggested defaults:
   - At least 4–5 episodes across at least 2 calendar weeks and at least 2 contexts.
   - Recompute on a rolling window, and show "still seen / dormant."
   - Build models per person, not from population templates (Fisher 2018: 2–4× within-person variance; Frumkin 2021: user structures "differed markedly" from predictions).
   - Validate patterns at the episode level and the daily level separately; effects can reverse across timescales (Stefan 2025).

7. **Detect sequences, not just co-occurrence.** Your strongest signals are **ordered transitions**: invalidation → shame → urge to isolate, or a DEAR MAN session → self-critical check-in the next morning. These mirror the schema-mode finding (Vulnerable Child → Critical Parent; Berger et al. 2026). Use event-anchored windows such as "within 24h after a DEAR MAN session" rather than fixed intervals; coarse sampling missed fast transitions in that study.

8. **Polarizations deserve their own UI.** When opposing urges reliably co-occur or alternate (reach out vs. withdraw; Problem Solving barrier "I'll do it perfectly or not at all" vs. procrastination), offer **"two sides that both seem to care about something"** rather than two separate parts. Present them side by side with equal size and weight, and never mark one as the bad one.

9. **Only propose in states of opportunity.**
   - Never surface a pattern during or within about 2 hours of a high-intensity urge or crisis check-in. NSSI urges last 1–30 minutes (Nock 2009), so wait for a calm window.
   - Gate on recent distress, time since last urge, and an explicit "Do you have a few calm minutes to look at something?" (receptivity, per Nahum-Shani).
   - Rate-limit to at most one new proposal a week. Reflection must not become rumination (Eikey 2021).

10. **Self is the space, not a node.** Don't draw Self as a central bubble connected to part bubbles, which makes Self "one more part." Make Self the **canvas, light or water** (Booth's sun behind the clouds; InnerPond's pond and shared roots). Map layout is **user-arranged** with timestamped snapshots. No auto-layout that implies hierarchy or "most central part" (Bringmann 2019 on centrality).

11. **Abstract, user-chosen visuals; no mascot, no collecting.**
    - Let users pick a shape, color, symbol or their own drawing (Holmes's cards, sandtray figures, Schwartz's "simple drawing").
    - No cartoon guide (the IFS Guide dog drew criticism).
    - No "collect all parts," streaks, leveling or shareable archetype cards (Mindberg). Disco Elysium's voices work because they are *authored fiction*. You are not authoring a person.

12. **Don't let the AI speak as a part.** "Chat with your part," where an LLM writes in the part's voice, is the market default and the most reifying pattern. It also invites sycophancy and confabulated memories (the IFS Institute's corroboration stance on memories). Instead, the AI (or static copy) asks **the user** to check inside and type what they notice. Avoid fast chat-bubble ping-pong for this flow (Nick Barr's warning) and use slow, single-question screens.

13. **Plural- and dissociation-aware by design.**
    - Add a short, optional onboarding/settings question about experiences of losing time or feeling like separate people.
    - If endorsed, **default parts language off**, offer "system/headmates" vocabulary, suppress pattern-to-part proposals, and nudge toward a trauma-informed clinician.
    - Never use "we all have parts" normalization as a default script (Twombly; Parry 2022).
    - **Co-design with plural and DID users**, as Hellblade did with voice-hearers.

14. **Pair parts language with agency every time.** Mirror DBT: "A part of me wanted to ___ — and I chose / can choose ___ (skill)." Link each part card to the DBT skills that helped in that chain (Opposite Action wins, DEAR MAN outcomes). The part becomes a reason to use skills, not an excuse.

15. **Survive lapses and let parts change.** Parts go "quiet," not "gone." Parts can be merged, split, renamed, retired or archived, with history kept (Epstein's lapsing and resuming; the map doc's "approximations"). Keep "maybe" suggestions the user found odd but interesting (InnerPond's productive misalignment).

16. **Clinician bridge, opt-in.** Offer a one-page export ("patterns I've noticed + what helped") for a DBT or IFS therapist, in the style of Parts Companion and Parts: An IFS Companion. Clients value idiographic models even when therapists are lukewarm (Frumkin 2021), so make it skimmable for skeptical therapists.

17. **Privacy posture at least as strong as Stoic or Utah law.**
    - Run pattern inference **on-device** where feasible.
    - No third-party analytics on parts data, no training on it.
    - One-tap export and delete, and a separate delete for "parts" without losing logs.
    - Parts data is more sensitive than mood data because it is an identity model (Mozilla 2023; Utah's no-sale rule).

18. **Copy and claims discipline.** Call it "reflection," "noticing patterns" and "IFS-informed." Never "AI therapist," "therapy," "heal your exiles" or "evidence-based IFS." Mind the Illinois and Nevada rules, the APA advisory, and IFS's thin RCT base (SAP 2024; The Nation 2025).

19. **Measure benefit and harm.**
    - Benefit: decentering ("I am here *with* the fear," Kopald), self-compassion, and skill use after a proposal.
    - Harm signals to watch: distress check-ins within 24h of viewing parts, spikes in dissociation items, rapid creation of many parts (possible self-diagnosis spiral; Tse & Haslam), deleting parts, "Not me" rates. Kill-switch the feature per user if harm signals rise. Note that 56% of students with mental illness felt their tracked data reflected badly on them (Kelley 2017).

20. **Ship in stages.**
    - v1: user-created parts and maps, linked by hand to logged entries ("tag this check-in to a part").
    - v2: pattern proposals with evidence cards.
    - v3: polarization views.
    - Only then: any LLM reflection, and still never voicing parts.
    - Each stage tests whether users *want* inference. Pew and CSCW 2022 suggest many will, if they keep control.

---

## Sources

**Apps and products**
- IFS Guide – App Store: https://apps.apple.com/us/app/ifs-guide/id1559214994 ; AppFollow: https://apps.appfollow.io/ios/ifs-guide/1559214994?country=us ; FAQ: https://www.ifsguide.com/ifsguide-app-faq
- Sentur – App Store: https://apps.apple.com/xk/app/sentur/id1506603757
- IFS.space – https://ifs.space/blog/richard-schwartz-ifs ; https://ifs.space/blog/chatgpt-for-ifs-therapy ; https://ifs.space/compare/chatgpt
- Parts Companion – https://www.partscompanion.org/
- All My Parts – https://apps.apple.com/app/id6777243778
- Parts: An IFS Companion – https://apps.apple.com/us/app/parts-an-ifs-companion/id6760776118
- Parts Work – https://apps.apple.com/us/app/parts-work/id6747560934
- Rosebud IFS Journal – https://www.rosebud.app/blog/unlock-your-inner-wisdom-exploring-internal-family-systems-ifs-with-the-rosebuds-ifs-journal ; roadmap: https://help.rosebud.app/getting-started/roadmap
- Trait Path comparison (vendor) – https://www.traitpath.com/blog/articles/best-ifs-assessment-tools-compared
- IFS Chat GPT prompt – https://github.com/jamesarcher9000/ifschat
- Nick Barr prototype – https://allbein.gs/ifs/
- Self-Therapy Journey / Earley – https://www.goodreads.com/work/quotes/41906178 ; https://www.goodreads.com/book/show/32193879 ; https://en.wikipedia.org/wiki/Jay_Earley ; https://www.selftherapyjourney.com/ ; https://www.abebooks.com/9780984392766/Resolving-Conflict-Working-Polarization-Using-0984392769/plp ; https://www.antoinebuteau.com/self-therapy-book-summary/
- InnerPond (CHI 2026) – https://arxiv.org/html/2603.27563 ; https://doi.org/10.1145/3772318.3791248
- How We Feel – https://medicine.yale.edu/news-article/the-how-we-feel-app-helping-emotions-work-for-us-not-against-us/
- Stoic – https://www.getstoic.com/blog/stoic-foundation-model-ai-features
- Mindberg Shadow Work – https://apps.apple.com/us/app/id6446803413 ; Life Note roundup – https://blog.mylifenote.ai/best-shadow-work-apps/

**Practitioner and community**
- John Clarke podcast – https://www.johnclarketherapy.com/podcast/ai-exiles-ethics-in-ifs
- Kabel / Schwartz & Sweezy on backlash – https://sequencewiz.org/2023/05/03/why-do-our-efforts-to-heal-ourselves-and-help-our-students-sometimes-fail/
- Twombly transcript – https://internalfamilysystems.pt/sites/default/files/2022/docs/media/Trauma%20and%20Dissociation%20Informed%20IFS%20with%20Joanne%20Twombly-transcript.pdf
- Kathy Steele – https://envisionworkshops.com/kathy-steele-on-demand-adapting-internal-family-systems
- The One Inside (Schwartz & Ocean) – https://theoneinside.substack.com/p/were-all-multiples-bridging-ifs-and-710
- MyPTSD thread – https://www.myptsd.com/threads/when-internal-family-systems-therapy-goes-wrong.90728/page-2
- Reddit snapshot (r/Foodforthought) – https://reddit.sentinel-team.org/posts/1r7873b/snapshots/2026-02-18T01%3A55%3A50.28594Z
- KQED/NPR on parts work – https://www.kqed.org/mindshift/64919/ever-felt-so-stressed-you-didnt-know-what-to-do-next-try-talking-to-your-parts
- Self Leadership Journey (protector behaviors) – https://selfleadershipjourney.substack.com/p/identifying-protective-parts-and
- IPTrauma (Fisher quote, structural dissociation) – https://iptrauma.org/docs/body-of-knowledge-of-psychotraumatology/parts-theory-ego-state-theory-and-structural-dissociation-differences-overlaps-and-clinical-implications-for-trauma

**Representation and visual**
- Therapy in a Nutshell parts mapping – https://therapyinanutshell.com/mapping-your-parts/
- Parts map doc – https://docs.google.com/document/d/e/2PACX-1vTamHyUoiSCc5rXUAilDmsgnaQZW_Z-EhVlpzcHXZPpDzYoHStWa9wb7eUotsuJKtGCfgQ2-OhV9sZj/pub
- Trailheads worksheet – https://insighttimer.com/therapists/worksheet/ifs-trailheads-how-to-find-and-explore-your-inner-parts
- Booth illustrated guide – https://theoneinside.substack.com/p/picture-this-a-beautifully-illustrated
- Tom Holmes – https://theoneinside.libsyn.com/ifs-and-parts-work-with-tom-holmes
- Sandtray + IFS (Turns et al. 2020) – https://oasis.library.unlv.edu/mft_fac_articles/114/
- IFS on a CAT map – https://www.acat.org.uk/resources/reformulation-articles/integrating-ideas-from-internal-family-systems-therapy-into-cognitive-analytic-therapy
- Disco Elysium – https://parallelsuns.com/blog/techniques-of-thought-cognition-identity-and-ideology-in-disco-elysium/ ; https://en.wikipedia.org/wiki/Disco_Elysium ; https://marqmarice.medium.com/irreducible-multiplicities-of-elysium-9cba2eeb12a4
- Inside Out – https://news.berkeley.edu/2015/07/07/psychologists-on-inside-out-nyt ; https://mydenvertherapy.com/unpacking-your-emotions-inside-out-and-internal-family-systems-therapy/
- Celeste – https://drmaciver.com/notebook/2020/03/the-inner-game-of-celeste/
- Hellblade – https://www.sciencefocus.com/the-human-body/how-hellblade-senuas-sacrifice-deals-with-psychosis
- Hoff critique – https://chrishoff.substack.com/p/the-dark-side-of-internal-family

**Pattern detection, EMA, JITAI**
- DBT chain analysis – https://psychotherapyacademy.org/behavioral-chain-analysis-in-dbt-a-therapists-handout/
- Berger et al. 2026, schema-mode sequences – https://api.crossref.org/works/10.1521/jscp.2026.45.2.133 ; https://guilfordjournals.com/doi/10.1521/jscp.2026.45.2.133
- Stefan et al. 2025 – https://link.springer.com/article/10.1007/s12144-025-08264-2
- Nock et al. 2009 – https://nocklab.fas.harvard.edu/resource/nock2009self-injuriousthoughtsbehaviorsadolescentsyasjappdf
- Fisher, Medaglia & Jeronimus 2018 – https://pmc.ncbi.nlm.nih.gov/articles/PMC6142277
- Frumkin et al. 2021 – https://pubmed.ncbi.nlm.nih.gov/32838671/
- Rodebaugh et al. 2020 – https://pmc.ncbi.nlm.nih.gov/articles/PMC7708106
- Beltz et al. 2016 (GIMME) – https://pure.psu.edu/en/publications/bridging-the-nomothetic-and-idiographic-approaches-to-the-analysi/
- LCVAR clustering – https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9123755/
- Bringmann et al. 2019 – https://research-collection.ethz.ch/bitstream/20.500.11850/383309.1/1/Bringmannetal.2019JAP.pdf
- Nahum-Shani et al. JITAI – https://pmc.ncbi.nlm.nih.gov/articles/PMC5364076

**HCI: mixed initiative, reflection, algorithmic identity**
- Horvitz 1999 – https://erichorvitz.com/chi99horvitz.pdf
- Li, Dey & Forlizzi 2010 – https://ianli.owlstown.net/publications/17-a-stage-based-model-of-personal-informatics-systems
- Epstein et al. 2015 – https://library.selfresearch.org/research/a-lived-informatics-model-of-personal-informatics/
- Baumer 2015 (via TSRI paper) – https://arxiv.org/pdf/2103.16399
- Eikey et al. 2021 rumination – https://library.selfresearch.org/research/beyond-self-reflection-introducing-the-concept-of-rumination-in-personal-informatics/
- Kelley et al. 2017 – https://microsoft.com/en-us/research/wp-content/uploads/2017/02/Self-Tracking4MentalWellness-CHI2017.pdf
- Lee et al. 2022 "Algorithmic Crystal" – https://public.websites.umich.edu/~enicole/LeeMieczkowskiEllisonHancock_2022.pdf
- Pew 2019 (via Benton) – https://www.benton.org/headlines/facebook-algorithms-and-personal-data
- Chancellor et al. 2019 – https://experts.umn.edu/en/publications/a-taxonomy-of-ethical-tensions-in-inferring-mental-health-states-/

**Ethics, clinical, regulatory**
- Wikipedia IFS – https://en.wikipedia.org/wiki/Internal_Family_Systems_Model
- IFS Institute NY Mag response – https://ifs-institute.com/news-events/news/response-new-york-magazine-article
- SAP critique – https://societyforpsychotherapy.org/internal-family-systems-exploring-its-problematic-popularity/
- The Nation – https://www.thenation.com/article/society/internal-family-systems-scam/
- Let's Data Science (Vox coverage summary) – https://letsdatascience.com/news/internal-family-systems-faces-growing-skepticism-fc3cd8e4
- BPS interview with Schwartz – https://bps.org.uk/psychologist/these-parts-will-fight-end-protect-you
- Moore et al. FAccT 2025 – https://spirals.stanford.edu/research/llm-therapists
- APA advisory – https://www.news-medical.net/news/20251113/APA-urges-safeguards-for-using-AI-in-mental-health.aspx
- State laws – https://healthjournalism.org/blog/2025/08/states-crack-down-on-ai-for-behavioral-health-care
- Khawaja & Bélisle-Pipon 2023 – https://pmc.ncbi.nlm.nih.gov/articles/PMC10663264/
- Mozilla 2023 – https://www.mozillafoundation.org/en/blog/shady-mental-health-apps-inch-toward-privacy-and-security-improvements-but-many-still-siphon-personal-data/
- Tse & Haslam 2024 – https://www.madintheuk.com/2024/07/researchers-concerned-about-rise-in-psychiatric-self-diagnosing/
- Parry, Eve & Myers 2022 – https://e-space.mmu.ac.uk/627948/10/Parry2021_Article_ExploringTheUtilityAndPersonal.pdf

**Uncertainty flags**
- Many app details come from App Store or vendor pages fetched through a summarizer. Release dates for All My Parts and Parts: An IFS Companion don't match their app IDs.
- Trait Path, Harmony and Unblend are known only from a competitor's comparison.
- The Self-Therapy Journey mechanics are from memory.
- I could not access Reddit at all.
- The LCVAR paper's details were behind a captcha.
- Baumer's dimensions come from a secondary citation.
