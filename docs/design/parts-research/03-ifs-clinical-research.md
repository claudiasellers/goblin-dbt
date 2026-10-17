# Research Brief: Internal Family Systems (IFS) for a DBT App — Mechanics, Safety, Evidence, Integration, Measurement

*Compiled Oct 6, 2026. Every non-obvious claim has an inline source.*

**How to read the flags:**
- **[verified]** — I confirmed it on a primary or near-primary page.
- **[secondary]** — it comes from a summary, handout, or practitioner page, not the book itself.
- **[memory / unverified]** — I could not retrieve a source this session. Check it against the book before it becomes product copy.

Limitations on access:
- Several primary pages blocked automated fetching: PubMed, PMC, APA PsycNet, Taylor & Francis, JAMA, and The Cut.
- Some trial numbers therefore come from sponsor or author summaries. They are labelled.
- I did not have the full text of Schwartz & Sweezy (2020) or Earley's books. Exact wording attributed to them comes from training handouts, IFS Institute materials, or secondary summaries.

---

## 0. Executive summary (the parts that most affect product decisions)

1. **No official IFS Institute position on AI or apps was found** (searches across 2024–2026).
   - The Institute's news feed, help center, Terms of Use, and Level 1 materials contain nothing on AI.
   - The Terms of Use do two things that matter here:
     - They **prohibit scraping or automated copying of the Institute's site content**.
     - They **forbid using the marks "in connection with any product or service that is not provided by Company in any manner that is likely to cause confusion"** ([ToU](https://ifs-institute.com/terms-use)).
   - Treat "no statement" as **absence of evidence, not permission**.
2. **Trademark.** The IFS Institute (legal entity: The Center for Self Leadership, Inc.) claims "Internal Family Systems℠", "IFS℠", "IFS Certified™" and other marks ([ToU](https://ifs-institute.com/terms-use)).
   - It filed new US applications for IFS / IFS INSTITUTE / INTERNAL FAMILY SYSTEMS in Aug 2023 ([Justia](https://trademarks.justia.com/981/51/internal-family-98151674.html)). Status was unclear on the pages I could reach.
   - **Do not put "IFS" or "Internal Family Systems" in feature or product names.** Use "parts work" language.
   - If you want to describe the lineage, use a referential statement plus a non-affiliation disclaimer. PESI uses this pattern: "not endorsed by, sponsored by, or affiliated with the IFS Institute" ([PESI](https://www.pesi.com/item/how-embrace-suicidal-parts-internal-family-systems-119588)).
   - This is not legal advice. Get trademark counsel.
3. **Safety scope.**
   - Fairly safe self-guided: noticing parts, unblending, befriending protectors, gentle polarization dialogue. This is broadly agreed in self-help and practitioner sources.
   - Should not be app-delivered, especially for BPD, complex trauma, or dissociative users: exile contact and unburdening.
   - IFS's own trauma/dissociation specialists (Twombly) call standard IFS potentially "dangerous for people with dissociative disorders" and say backlash "can be extensive, can be dangerous" ([Twombly transcript](https://internalfamilysystems.pt/sites/default/files/2022/docs/media/Trauma%20and%20Dissociation%20Informed%20IFS%20with%20Joanne%20Twombly-transcript.pdf)).
   - Since Feb 2024 the Institute itself has limited clinical Level 1 training to licensed mental-health professionals ([IFS-I](https://Ifs-institute.com/news-events/news/creating-clarity-ifs-level-1-admissions-changes-coming-2024)).
4. **Evidence is thin.**
   - Small pilot RCTs: rheumatoid arthritis, n=79; depression, n=32.
   - Uncontrolled PTSD pilots.
   - One online group RCT (PARTS, n=60 vs. an active control). Proponents' summaries report large PTSD reductions **in both arms**, with better attendance and satisfaction for IFS. No published between-group PTSD superiority was described.
   - **Zero IFS studies for BPD** in a 2026 systematic review ([Francis, Fino & Heym 2026](https://irep.ntu.ac.uk/id/eprint/55128/)).
   - The Institute's own training brochure says "the risk of harm or adverse events needs to be systematically studied" ([Level 1 brochure 2026](https://ifs-institute.com/sites/default/files/training-brochure/na/1596%20IFS%20Training%20Brochure%207.6.26.pdf)).
5. **Measurement gap.**
   - The only IFS-native self-report instrument I found is the **IFS Scale** (57 items, 10 subscales) plus a **25-item Self Scale** ([DeLand, Strongin & Schwartz 2003](https://www.ifs-scale.com/wp-content/uploads/2022/12/Final-article.pdf)). It was published in the Institute's own *Journal of Self Leadership*, on a convenience sample, with no replication found.
   - Schema therapy's **Schema Mode Inventory** (118 items, 14 modes) is a validated parts-like measure, but it is licensed ([Lobbestael et al. 2010](https://www.maastrichtuniversity.nl/sites/default/files/ppp/70009612/SMI%20validation_Lobbestael%2Cvreeswijk%2Cspinhoven%2Cschouten%2Cartnz_BCP2010.pdf); [Schema Therapy Institute](https://schematherapy.com/id49.htm)).
   - The **Self-Compassion Scale Short Form** is free "for any purpose whatsoever" ([SCS-SF info](https://self-compassion.org/wp-content/uploads/2021/03/SCS-SF-information.pdf)).
6. **Recovered-memory risk is the biggest liability issue.**
   - Background: the Castlewood lawsuits (2011–2022); The Cut / New York Magazine, "The Truth About IFS, the Therapy That Can Break You" (Rachel Corbett, Oct 2025); the Institute's Nov 4, 2025 response.
   - The Institute's own line: "IFS does not accept previously unknown, unrealized, or 'recovered' memories as fact until corroborated by evidence" ([IFS-I response](https://ifs-institute.com/news-events/news/response-new-york-magazine-article)).
   - Build that principle into every prompt.

---

## 1. Process mechanics

### 1.1 Canonical sources and structure

Schwartz & Sweezy, *Internal Family Systems Therapy*, 2nd ed. (Guilford) [verified TOC, [Guilford](https://www.cms.guilford.com/books/Internal-Family-Systems-Therapy/Schwartz-Sweezy/9781462541461/contents)]:
- Ch. 8 "In-Sight and Direct Access"
- Ch. 9 "Finding, Focusing, and Fleshing Out Protectors"
- Ch. 10 "Feeling toward, Befriending, and Exploring Protector Fears"
- Ch. 11 "Changing Protector Polarizations"
- Ch. 12 "Unburdening Exiles"
- Ch. 13 "Doing Inner Work Safely"
- Ch. 5 "IFS and the Body"
- Ch. 20 "The Laws of Inner Physics"
- A glossary

No 3rd edition exists as of this search. Sweezy's *IFS Therapy for Shame and Guilt* (Guilford, 2023) is a relevant companion ([Guilford](https://guilford.com/books/Internal-Family-Systems-Therapy-for-Shame-and-Guilt/Martha-Sweezy/9781462552467/author)).

IFS Institute Level 1 learning objectives (2024) [verified, [IFS-I PDF](https://ifs-institute.com/sites/default/files/inline-files/Learning%20Objectives%20IFS%20Level%201%20Training%20with%204%20multi-day%20sessions%20and%202%20single-day%20sessions%206.10.24.pdf)] name these as core competencies:
- "the Six Fs (find, focus, flesh out, feel toward, fears, befriend)"
- "unblending"
- the 8 qualities of Self
- "in-sight" and "direct access"
- "the nine most common protector fears"
- "the eight steps of unburdening exiles"
- "personal, legacy, and cultural burdens"
- "at least two strategies of obtaining protector permission to access exiles"
- polarizations
- the "five Ps" of the Self-led therapist
- "the post-unburdening skills of Invitation and Integration"

Note the count: the Institute teaches **8** unburdening steps, but most published lists show **6**. I could not get the exact eight-step list (see 1.7).

Ontology:
- Parts are "forced from their valuable states into extreme roles" ([IFS-I About](https://ifs-institute.com/about-us)). Parts have **roles**, not fixed essences.
- Two protector classes:
  - **Managers**: proactive.
  - **Firefighters**: reactive, after an exile is triggered.
- **Exiles** hold the burdens.
- **Self** is described as "in everyone. It can't be damaged. It knows how to heal" ([IFS-I About](https://ifs-institute.com/about-us)).

### 1.2 The 6 Fs — practitioner questions

The 6 Fs are a protector-befriending protocol. Questions below are from Frank Anderson's PESI post [secondary but by a co-author of the IFS Skills Training Manual, [PESI](https://pesi.com/blog/details/1511/6-step-ifs-process-to-jumpstart-healing)] plus training handouts ([UWSP 2020](https://www3.uwsp.edu/conted/Anon/MHSUR%202020%20Presentations/28%20-%20Introduction%20to%20Internal%20Family%20Systems%20Therapy%20An%20Evidence-Based%20Model.pdf); [UNC/Klinger 2020](https://cls.unc.edu/wp-content/uploads/sites/3019/2020/03/Handouts-for-IFS.pdf)).

| Step | Purpose | Typical prompts |
|---|---|---|
| **Find** | Locate the target part. The entry point is a *trailhead*. | "Who needs your attention right now? Where do you notice it?" — usually located in or around the body |
| **Focus** | Turn attention inward | "Turn your attention inside." |
| **Flesh out** | Get detail on the part | "Can you see it? If so, how does it look? If not, how do you experience it?" Also shape, color, image, emotions, age, and how close or far it feels |
| **Feel toward** | Diagnose Self vs. blending | "How do you feel toward the part?" |
| **beFriend** | Build the relationship and learn its role | "How did it get this job? How effective is the job? If it didn't have to do this job, what would it rather do? How old is it?" |
| **Fears** | Find the protective logic, which points to an exile or a polarized protector | "What does it want for you? What would happen if it stopped doing this job?" |

Earley's parallel five-step protector sequence comes from *Self-Therapy*, as summarized [secondary, [Matuschak notes](https://notes.andymatuschak.org/zCAUiGe5aHakEY2F6YMdamU); [Buteau summary](https://www.antoinebuteau.com/self-therapy-book-summary/)]:
- **P1** Accessing the part
- **P2** Unblending from the target part
- **P3** Unblending from concerned parts
- **P4** Discovering the protector's role
- **P5** Developing a trusting relationship. Earley's prompt: "Let it know that you understand and appreciate it; check how it responds."

Permission to approach the exile follows P5. Earley's core protector questions:
- "What do you feel?"
- "What are you concerned about?"
- "What is your role and how do you do it?"
- "What do you hope to accomplish by playing this role?"
- "What are you **afraid** would happen if you didn't play that role?" Earley flags this as the most potent question.

**Trailhead** (as summarized from Earley): "usually an emotional reaction, a pattern of behavior, a somatic sensation, or an interpersonal conflict that indicates the presence of activated parts" [secondary, [Buteau .md](https://www.antoinebuteau.com/self-therapy-book-summary.md)]. Trailheads are the natural bridge to DBT diary cards and chain analysis (Section 4).

### 1.3 "How do you feel toward the part?" — the Self vs. blended-part diagnostic

Rule, from Klinger's UNC training handout: "Anything other than neutral or one of the 8 'C's' indicates that the client is blended with another part, which holds the feeling, e.g., fear or anger, toward (or an opinion of) the target part" [verified handout, [UNC](https://cls.unc.edu/wp-content/uploads/sites/3019/2020/03/Handouts-for-IFS.pdf)].

The **8 Cs** are curiosity, calm, compassion, confidence, courage, clarity, creativity, connectedness [verified, [IFS-I](https://ifs-institute.com/); [Level 1 objectives](https://ifs-institute.com/sites/default/files/inline-files/Learning%20Objectives%20IFS%20Level%201%20Training%20with%204%20multi-day%20sessions%20and%202%20single-day%20sessions%206.10.24.pdf)].

The **5 Ps** are patience, perspective, presence, playfulness, persistence [verified, [Level 1 objectives](https://ifs-institute.com/sites/default/files/inline-files/Learning%20Objectives%20IFS%20Level%201%20Training%20with%204%20multi-day%20sessions%20and%202%20single-day%20sessions%206.10.24.pdf)]. In the Institute's objectives these describe the **Self-led therapist**. Popular sources often extend them to the client's Self-energy generally.

When the answer isn't Self-like — e.g., "I hate it," "I want it gone," "it scares me," "it's pathetic":
- Treat that reaction as a **concerned part** (Earley's term).
- Acknowledge it, ask what it's worried about, and request that it "step back," "relax," or "give us some space."
- Re-ask the feel-toward question. Loop until a C-quality or curious neutrality appears.

Schwartz's phrasing: "ask the parts giving them those other feelings to give us some space so that we can just get to know this critic" [verified transcript, [System Speak](https://systemspeakpodcast.com/t-guest-schwartz)].

If a concerned part won't step back:
- Its fear becomes the new target. It is in effect a protector of the protector.
- The likely reason is a polarization (1.6).

**Self-like parts** [memory / unverified]: these are managers that mimic Self qualities, for example calm detachment or "spiritual" acceptance with an agenda. The clinical tell is an *agenda*, such as wanting the target part to change or go away, rather than curiosity. A text-based app can't easily tell real Self-energy from a Self-like manager. Parts Companion, an AI process-measurement project, notes that "raw 'Self-energy' estimates inflate for IFS-fluent clients" ([Parts Companion](https://partscompanion.org/research)). **Do not treat C-words in user text as proof of Self.**

### 1.4 Unblending, in-sight, direct access

**Unblending** is "differentiating sub-personalities from Self" ([Level 1](https://ifs-institute.com/sites/default/files/inline-files/Learning%20Objectives%20IFS%20Level%201%20Training%20with%204%20multi-day%20sessions%20and%202%20single-day%20sessions%206.10.24.pdf)). Common techniques in the self-help literature [secondary / memory]:
- Ask the part to separate, move back, or turn down its intensity.
- Imagine it at a distance or in a room.
- Externalize it on paper: Derek Scott's journaling, card mapping, sandtray, and body mapping ([Scott, Psyche](https://psyche.co/guides/how-to-get-to-know-and-love-all-the-parts-of-your-self%20)).
- For an exile that floods: "ask the Exile to reduce the intensity enough for the Self to stay present" (Earley, as summarized, [Buteau](https://www.antoinebuteau.com/self-therapy-book-summary.md)).

**In-sight vs. direct access** [verified via summary and transcript]:
- In-sight is "internal communication between a person's Self and their parts."
- Direct access is "when the therapist's Self talks directly to the parts of the client while the client listens" ([Shortform summary of Schwartz & Sweezy](https://www.shortform.com/pdf/internal-family-systems-therapy-pbp18613-b-pdf-richard-c-schwartz-and-martha-sweezy)).
- Direct access is used when the client can't access Self or unblend, and commonly with harsh inner critics ([UNC handout](https://cls.unc.edu/wp-content/uploads/sites/3019/2020/03/Handouts-for-IFS.pdf)).

Two forms of direct access (Paul Neustadt; [transcript](https://www.internalfamilysystems.pt/sites/default/files/2022/docs/media/The%20Gifts%20of%20our%20Protectors%20and%20Direct%20Access%20with%20Paul%20Neustadt-transcript.pdf)):
- **Implicit**: the therapist talks to the part without naming it.
- **Explicit**: "it sounds like you're blended with this particular part of you. How about if we just let that part be blended and ask it to just talk directly to me."
- A "three-chair" polarization variant is used for polarized firefighters.

The Institute sells a course, "Direct Access: An Essential IFS Skill" (Frances Booth & Dick Schwartz), with a module on "ten common protector fears" ([IFS-I Learn](https://learn.ifs-institute.com/programs/direct-access-an-essential-ifs-skill-with-frances-booth-and-dick-schwartz/modules/module-3-addressing-protector-fears)).

Product implication: an LLM conversing "with" a user's part is functionally **direct access by a non-Self, non-clinician agent**. This is a novel and unvalidated use. Implicit direct access (validation-flavored replies to the blended part) is closer to standard DBT validation and lower-risk than explicitly role-playing parts.

### 1.5 Protector work

**Positive intention and fears.** Ask "What are you trying to accomplish?" and then "What are you afraid would happen if you didn't do this?" ([Earley summary](https://notes.andymatuschak.org/zCAUiGe5aHakEY2F6YMdamU)).

**Common protector fears with model responses** — IFS Institute training PDF by Fran Booth [verified, [IFS-I PDF](https://ifs-institute.com/sites/default/files/inline-files/SATURDAY_Direct%20Access_Fran%20Booth%20(2).pdf)]:

| # | Protector fear | Model response |
|---|---|---|
| 1 | The exile will overwhelm | "There are ways we can help that (target) part not have to take over, and to control the intensity." |
| 2 | Nothing will help | "...there's another way/another resource inside (Self)." |
| 3 | Dangerous firefighters will be triggered (self-harm, suicide, rage, addiction) | "We can work next with that firefighter and do so safely..." |
| 4 | The therapist will react badly | — |
| 5 | The protector will become obsolete | "We're not trying to get rid of you..." |
| 6 | Secrets will be revealed | — |
| 7 | External constraints (someone outside will resist the change) | — |
| 8 | The exile will be hurt again | "You can come back in and stop us if you think that is happening." |
| 9 | Self-energy itself is dangerous (it was punished in the past) | — |
| 10 | Fear of therapy ending | — |

The UWSP list adds "polarized part takeover" and "absence of Self" ([UWSP](https://www3.uwsp.edu/conted/Anon/MHSUR%202020%20Presentations/28%20-%20Introduction%20to%20Internal%20Family%20Systems%20Therapy%20An%20Evidence-Based%20Model.pdf)). For an app, fears 3 and 8 map directly onto DBT crisis-behavior targets.

**Job description.** Role, trigger conditions, methods, goal, feared outcome, how long it has done this, cost to the system, and what it would rather do. Anderson: "If it didn't have to do this job, what would it rather do?" ([PESI](https://pesi.com/blog/details/1511/6-step-ifs-process-to-jumpstart-healing)). These fields map cleanly onto a part record on the user profile.

**Age and "updating"** [memory / secondary]:
- Ask "How old are you?" and then "How old do you think I am?"
- Protectors often believe the client is still a child.
- "Updating" means showing the part the client's current age, capacities, and life circumstances, which often relaxes it.
- The IFS-practitioner podcast *Purely IFS* has an episode titled "Updating and Meeting Self" ([episode](https://nl.player.fm/series/purely-ifs-with-emma-and-gayle/updating-and-meeting-self-part-1)). I did not retrieve canonical book phrasing.

**Gaining permission to approach an exile.**
- Never "force, bypass or dismiss the protector" ([Way of Belonging](https://www.wayofbelonging.com/post/steps-for-healing-an-exile-in-ifs)).
- Earley: "Reassure the Protector that the Self can handle what is underneath" ([summary](https://www.antoinebuteau.com/self-therapy-book-summary.md)).
- Before exile work, ask: "Is everything, every part of you, okay with going there right now?" ([Forstmeyer](https://en.lucasforstmeyer.com/internal-family-system-ifs/ifs-course-12/)).
- Sweezy's reassurance to a firefighter: "If it tries something new and doesn't like it, it can always go back to doing what it has been doing. No one can stop it" ([Psychwire Q&A](https://psychwire.com/free-resources/q-and-a/5axjlz/understanding-internal-family-systems)).

### 1.6 Polarizations

Definition: "When two protective parts hold conflicting points of view, they are polarized. This polarization contributes to maintaining the homeostatic balance of the system." Klinger's example: a manager criticizes overeating, while a firefighter believes restriction would flood the system with rejection-based exile pain ([UNC](https://cls.unc.edu/wp-content/uploads/sites/3019/2020/03/Handouts-for-IFS.pdf)).

Working sequence, from former IFS lead trainer Elizabeth Taeubert's PESI outline [secondary, [PESI](https://www.pesicanada.ca/item/ifs-polarization-172578)]:
1. Identify and name the polarization.
2. Unblend from both sides.
3. Get permission to work with each side.
4. Run the Fs with each side in turn.
5. Switch perspectives.
6. Highlight shared intentions (both want something good for the person).
7. Check how they now feel toward each other.
8. Ask permission to go to the exile(s) they both protect.

Polarization types she lists: manager/exile, manager/manager, manager/firefighter. Self acts as mediator. Earley wrote a full book on this, *Resolving Inner Conflict* ([IFS-I store](https://Ifs-institute.com/store/155)).

The mechanism [memory]: each side's escalation is a reaction to the other ("if I let up, it will take over"). With Self present, each side can agree to step back and let Self handle the situation. This is closely analogous to DBT's dialectical dilemmas (Section 4).

### 1.7 Exile work and unburdening

The commonly published six-step sequence [secondary; consistent across [UWSP](https://www3.uwsp.edu/conted/Anon/MHSUR%202020%20Presentations/28%20-%20Introduction%20to%20Internal%20Family%20Systems%20Therapy%20An%20Evidence-Based%20Model.pdf), [SequenceWiz citing Schwartz & Sweezy](https://sequencewiz.org/2023/05/24/connecting-to-the-vulnerable-parts-and-releasing-their-burdens-into-the-elements/), and [Forstmeyer](https://en.lucasforstmeyer.com/internal-family-system-ifs/ifs-course-12/)]:

0. **Access with permission.** Unblend from the exile if it floods.
1. **Witnessing.** "What does the part want you to know?" Witnessing continues until the part feels fully understood.
2. **Do-over (redo / reparenting).** The Self goes into the scene and gives the part what it needed then: "What would the part have needed back then?"
3. **Retrieval.** Bring the part out of the past scene to a safe place or the present.
4. **Unburdening.** Locate the burden in or on the body. Release it to an element (light, water, fire, earth, wind). "Does the part now still carry anything from the past that it can let go of?"
5. **Invitation.** Invite in the qualities it needs, e.g. "love, courage, playfulness, and compassion."
6. **Integration / check back with protectors.** "Did they witness this? Do they still need to do their job the same way?" Protectors may take new roles. The Institute names "Invitation and Integration" as post-unburdening skills ([Level 1](https://ifs-institute.com/sites/default/files/inline-files/Learning%20Objectives%20IFS%20Level%201%20Training%20with%204%20multi-day%20sessions%20and%202%20single-day%20sessions%206.10.24.pdf)).

**Aftercare.** Schwartz is quoted (via secondary) as saying "it usually takes about three to four weeks of ongoing checking in and reassuring of protectors for the new patterns of perception to be formed" ([SequenceWiz](https://sequencewiz.org/2023/05/24/connecting-to-the-vulnerable-parts-and-releasing-their-burdens-into-the-elements/)). I could not verify the page number.

Flag: the Institute says it teaches **eight** steps. The two extra are probably permission/access and a separate protector check-in or follow-up, but I could not confirm this.

### 1.8 Legacy burdens; unattached burdens

**Legacy burdens** are burdens "that came down through the generations" (Schwartz, [Sounds True transcript](https://www.soundstrue.com/a/resources/transcript/richard-schwartz-and-tamala-floyd-healing-across-generations-ifs-ancestral-wisdom/)).
- Practitioners ask what percentage of the burden belongs to the client versus where it came from.
- They release it by handing it "back to the person I had inherited it from... all the way through the ancestral line," then to an element ([Kay Gardner, PESI UK](https://pesi.co.uk/blogs/legacy-burdens-ifs-energy-work-and-intergeneratio)).
- The Institute's taxonomy is personal, legacy, and cultural burdens ([Level 1](https://ifs-institute.com/sites/default/files/inline-files/Learning%20Objectives%20IFS%20Level%201%20Training%20with%204%20multi-day%20sessions%20and%202%20single-day%20sessions%206.10.24.pdf)).

**Unattached burdens (UBs) are controversial.**
- They are described as "not 'parts' of the self, but something quite other entirely" (episode description of Schwartz on the Aubrey Marcus Podcast, July 7, 2025, [link](https://www.aubreymarcus.com/blogs/aubrey-marcus-podcast/life-changing-therapy-healing-parts-revealing-entities-ifs-founder-dr-richard-schwartz-502)).
- They are elaborated in Robert Falconer's *The Others Within Us* (2023).
- Scott Alexander's critical review argues the framework can induce iatrogenic "possession" beliefs and cites a group where demon-focused work produced "a severe and avoidable iatrogenic possession epidemic" ([ACX review, May 21, 2024](https://gwern.net/doc/www/www.astralcodexten.com/a95626987212445f8bb5a4268862f1ae6cf839e4.html)).
- **Recommendation: exclude UBs entirely from a clinical app.**

### 1.9 Body, image, age; Self-energy

- Parts are typically located somatically ("where do you notice it?") and fleshed out by image, size, color, age, and distance.
- Schwartz & Sweezy has a chapter on the body (Ch. 5).
- [memory] Susan McConnell's *Somatic IFS* (2020) extends this with practices for somatic awareness, breath, resonance, movement, and touch.
- "Self-led" means Self holds the "seat of the soul" while parts are consulted. It does not mean parts are absent.
- Schwartz's later writing frames Self in spiritual terms, which is relevant to the critique in 3.4.

### 1.10 Daily practice, journaling, parts check-ins

Derek Scott (Psyche guide) recommends ([Psyche](https://psyche.co/guides/how-to-get-to-know-and-love-all-the-parts-of-your-self%20)):
- Split-page journaling for conflicting parts
- Recording parts by email or video, then reviewing calmly
- Card mapping
- Sandtray
- Body mapping
- Casual "who's up?" check-ins

He also advises: "If your degree of shame is intense... explore your exiled parts with a therapist who is familiar with IFS."

Michelle Glass, *Daily Parts Meditation Practice* (sold by the IFS Institute), uses Parts Timelines, Parts Catalogue Cards, Parts Biographies, Parts Maps, and Parts Externalizations ([IFS-I store](https://Ifs-institute.com/store/178)). These are a ready-made schema for a profile-stored parts record.

[memory / unverified] *No Bad Parts* (2021) exercises include parts mapping, a "path" Self-access meditation, a "fire drill" for interpersonal triggers, and working with a polarization.

### 1.11 Earley & Weiss typologies

**Seven Inner Critic types** (Earley & Weiss) [verified handout, [Seven Types PDF](https://static1.squarespace.com/static/5c03ced75ffd204418037b7a/t/5c3fe62b7ba7fc1e43005c7f/1547691563363/Seven+Types+of+Inner+Critics.pdf)]:

| Type | Description from the handout |
|---|---|
| Perfectionist | Sets high standards and struggles to call work finished |
| Guilt-Tripper | "stuck in the past... unable to forgive you" |
| Underminer | Undermines confidence "so that you won't take risks" |
| Destroyer | "pervasive attacks on your fundamental self-worth"; early trauma; the most debilitating |
| Conformist / **Molder** | Tries to make you "fit into a certain mold" |
| Taskmaster | Pushes hard work and success; fears mediocrity |
| Inner Controller | Controls impulses (eating, drinking, sex) with harsh methods |

Naming note: the 2010s book *Freedom from Your Inner Critic* uses **"Molder"** (confirmed in a 2018 summary, [Goodreads blog](https://www.goodreads.com/author_blog_posts/17598226-the-7-types-of-inner-critic-which-one-s-do-you-recognise?tab=book)). Later Earley materials use **"Conformist."** Both are the same type.

The healthy counterparts are the **Inner Champion** (self-esteem) and **Inner Mentor** (self-reflection). The critic's ally is the **Inner Defender** (shown below as a pattern).

**Earley's Pattern System** [verified via the author's PDF, [The Pattern System](https://s3.amazonaws.com/STJ/E14-PDF-The-Pattern-System.pdf); a book also exists, [Amazon](https://www.amazon.com/Pattern-System-Periodic-Table-Psychology-ebook/dp/B00GI9YTC2)]:
- Three dimension groups.
- Each dimension pairs dysfunctional **patterns** with healthy **capacities**, in a dialectical structure.
- Patterns transform by developing the polar-opposite capacity.
- Earley links patterns to IFS parts: e.g., people-pleasing statements "made by a People-Pleasing Part."
- Each pattern entry lists behaviors and feelings, typical thoughts, triggering situations, and a "false belief." Example: People-Pleasing — "It is dangerous to assert myself. I must please others for them to like me and connect with me."
- The system was paired with quizzes and the Self-Therapy Journey web app.

The table below came from automated extraction of the PDF. Dimension names are reliable; some pattern/capacity pairings may be slightly mis-assigned. Verify against the book before shipping.

| Group | Dimension | Patterns | Capacities |
|---|---|---|---|
| Interpersonal | Intimacy | Dependent, Distancing | Intimacy, Self-Support |
| Interpersonal | Conflict | Conflict-Avoiding, Judgmental, Defensive | Good Communication, Challenge, Limit-Setting |
| Interpersonal | Power | People-Pleasing, Passive-Aggressive, Controlling, Rebel | Cooperation, Assertiveness |
| Interpersonal | Care | Caretaking, Self-Absorbed, Entitled | Caring, Self-Care |
| Interpersonal | Social | Self-Effacing, Charmer | Genuine, Social Confidence |
| Interpersonal | Strength | Disowned Anger, Angry | Centered, Strength |
| Interpersonal | Trust | Gullible, Suspicious | Trust, Perceptiveness |
| Interpersonal | Honesty | Deceptive, Blunt | Tact, Honesty |
| Interpersonal | Evaluation | Idealizing, Judgmental | Appreciation, Perceptiveness |
| Interpersonal | Responsibility | Victim, Powerless, Controlling | Surrender, Responsibility |
| Inner Critic | Self-Esteem | Inner Critic, Prideful, Inner Defender | Inner Mentor, Inner Champion |
| Inner Critic | Accomplishment | Taskmaster, Procrastination | Work Confidence, Ease |
| Inner Critic | Quality | Perfectionist, Sloppy | Quality, Ease |
| Inner Critic | Risk | Underminer, Obsessive-Compulsive, Phobic, Reckless | Prudence, Courage |
| Inner Critic | Individuality | Conformist, Rebel | Cultural Integration, Individuality |
| Inner Critic | Pleasure | Inner Controller, Indulger | Conscious Consumption, Pleasure |
| Inner Critic | Conscience | Guilt Tripper, Callous | Remorse, Self-Forgiveness, Self-Acceptance |
| Inner Critic | Energy | Destroyer, Depressed, Anxious, Manic | Peace, Aliveness |
| Inner Critic | Decision | Doubter, Impulsive | Thoughtfulness, Decisiveness |
| Personal | Change | Change Taskmaster, Change Procrastination, Change-Avoiding | Change Accomplishment, Process Ease |
| Personal | Hope | Pessimistic, Pipe Dream | Realism, Hope |
| Personal | Reason/Emotion | Overly Intellectual, Labile/Histrionic | Reason, Emotion |
| Personal | Coherence | Rigid, Foggy/Distracted | Clarity, Creativity |
| Personal | Vision | Plodding, Pipe Dream | Practicality, Vision |
| Personal | Resilience/Sensitivity | Fragile, Closed | Resilience, Sensitivity |

The interpersonal patterns split into "hard" patterns (painful to others) and "soft" patterns (painful to self). Counts: 10 interpersonal + 9 inner critic + 6 personal dimensions.

Product relevance:
- This is the closest published precedent for **behavior → part-hypothesis detection**.
- The dimension/opposite-capacity structure is dialectical, which suits DBT.
- It has **no psychometric validation** that I found.

---

## 2. Safety and scope for self-guided or app-delivered IFS

### 2.1 Positions

**IFS Institute.** I found no explicit statement on self-guided IFS or AI.
- It restricted clinical Level 1 training (US/Canada) from Feb 2024 to those "already qualified and legally credentialed to work in a mental health profession," separating clinical IFS from non-clinical applications ([IFS-I, Feb 2024](https://Ifs-institute.com/news-events/news/creating-clarity-ifs-level-1-admissions-changes-coming-2024)).
- Its Level 1 brochure (2026) says the "risk of harm or adverse events needs to be systematically studied" ([brochure](https://ifs-institute.com/sites/default/files/training-brochure/na/1596%20IFS%20Training%20Brochure%207.6.26.pdf)).
- It sells self-help books (Earley, Glass), so it implicitly endorses some self-directed parts work.

**Practitioner and self-help consensus** [secondary; e.g. [Annie Wright](https://anniewright.com/parts-work-without-therapist/), [Yalom.com review](https://www.yalom.com/best-ifs-books), [Scott/Psyche](https://psyche.co/guides/how-to-get-to-know-and-love-all-the-parts-of-your-self%20)]:
- Generally safe alone: noticing parts, unblending, journaling, befriending managers, protector-first pacing.
- Belongs with a therapist: exile work and formal unburdening ("significant trauma work belongs with a therapist, and the books themselves say so").
- I could not retrieve verbatim cautions from Schwartz's *No Bad Parts* or Earley's *Self-Therapy*. Verify before quoting them.

**Dissociative disorders** (Joanne Twombly, IFS-trained dissociation specialist; [transcript](https://internalfamilysystems.pt/sites/default/files/2022/docs/media/Trauma%20and%20Dissociation%20Informed%20IFS%20with%20Joanne%20Twombly-transcript.pdf); her chapter "Integrating IFS with Phase-Oriented Treatment of Clients with Dissociative Disorder," in Sweezy & Ziskind, eds., 2013 — listed in the [IFS bibliography](https://ifs-institute.com/resources/research/ifs-bibliography-apa-style)):
- Standard IFS can be "dangerous for people with dissociative disorders."
- Stabilization comes first, then "paced uncovering": "put 95% of it away and see how we do with 5%."
- It is "much harder for people to get into Self."
- Protectors have legitimate terror of Self-qualities emerging in abuse contexts.
- Backlash "can be extensive, can be dangerous."

Schwartz himself equates parts with DID alters, differing only by "the degree of, and the severity and chronicity of the trauma." He notes amnesic barriers make co-presence "very scary" ([System Speak](https://systemspeakpodcast.com/t-guest-schwartz)). Critics from the DID/OSDD community say:
- Some systems have multiple selves, not one Self.
- High amnesic barriers make "the host as Self" protocol "highly problematic, if not impossible" ([Healing My Parts](https://healingmyparts.substack.com/p/whats-the-scoop-about-ifs-for-did)).

### 2.2 Known risk mechanisms (design these as detectable states)

- **Protector backlash.** A protector reacts after vulnerability (self-harm, binge, rage, shutdown, relationship rupture), often hours to days after a session. Booth's fear #3 and Twombly's warning describe it.
- **Flooding.** The user blends with an exile and is overwhelmed by its affect. Earley's mitigation is to ask the exile to reduce its intensity. App mitigation: hard stop, then grounding and DBT distress-tolerance skills.
- **Dissociation.** Shutdown, depersonalization, losing time. Gate on screening (e.g., DES-II; [memory] Carlson & Putnam 1993; I did not verify licensing) and on in-session signals.
- **Fragmentation and reification.** "Labeling every thought, emotion... as distinct 'parts' may inadvertently reinforce fragmentation rather than promoting integration." This is Chandler 2022 as cited by IPTrauma; I did not see the primary source. Janina Fisher reserves parts language for genuinely dissociative presentations ([IPTrauma](https://iptrauma.org/docs/body-of-knowledge-of-psychotraumatology/parts-theory-ego-state-theory-and-structural-dissociation-differences-overlaps-and-clinical-implications-for-trauma)). **This is directly relevant to auto-"discovering" parts from behavioral data.**
- **Suggestibility and false memory.** The Castlewood lawsuits alleged implanted memories of abuse and satanic ritual (five women sued from 2011; settled or dismissed; two more suits in 2022, also dismissed). Richard Schwartz was a consultant and trainer there; Castlewood's founder, Mark Schwartz, is unrelated ([Wikipedia: Alsana](https://en.wikipedia.org/wiki/Alsana); [News Tribune 2013](https://www.newstribune.com/news/2013/dec/17/implanted-memory-suits-may-be-near-dismissal/); [IFS-I response](https://ifs-institute.com/news-events/news/response-new-york-magazine-article)).
- **Reality-testing and psychosis.** Brownstone, Hunsicker & Greene warn that splitting the self into parts "for those who struggle with reality testing might be disorganizing" ([Society for the Advancement of Psychotherapy, Jun 26, 2024](https://societyforpsychotherapy.org/internal-family-systems-exploring-its-problematic-popularity/)).

### 2.3 AI and apps — what exists (no official sanction found)

- **IFS Guide.** AI guide named "Sunny." Disclaimer: "IFS-informed self-reflection tools and is not a substitute for professional mental health care." No IFS-I affiliation is claimed ([site](https://www.ifsguide.com/)).
- **Harmony** (Harmony Mental Health, LLC). IFS + CBT voice AI. Users describe it as a "Self energy surrogate" ([site](https://www.harmonyappai.com/)).
- **IFS Buddy.** Claims endorsement by "Mind-Beyond Institute — the official IFS training body for Australia and NZ" ([site](https://www.ifsbuddy.chat/)). The IFS Institute lists mindbeyond.com.au (Simon d'Orsogna) as its ANZ International Partner ([IFS-I partners](https://ifs-institute.com/about-us/international-partners)). I did not independently confirm the endorsement. If accurate, it is the closest thing to a sanctioned-affiliate AI precedent.
- **Parts Companion** (Evolve.org). Building "the field's first validated, observer-rated, automatable process measure for Internal Family Systems therapy," with LLM raters benchmarked against human IFS coders. It explicitly does not yet claim validity ([site](https://partscompanion.org/research)).
- The Institute's Nov 4, 2025 statement on the New York Magazine article does not address AI ([IFS-I](https://ifs-institute.com/news-events/news/response-new-york-magazine-article)).
- Practitioner-community discussion exists (e.g., "IFS in the AI Age," certified IFS therapist Sarah Houy, July 29, 2025, paywalled; [The One Inside](https://theoneinside.substack.com/p/ifs-in-the-ai-age-a-live-conversation)), but nothing institutional.
- **Bottom line: no IFS Institute or Schwartz statement on AI was found (searches through Oct 2026).** Report this as "none found," not "none exists."

### 2.4 Trademark and branding

- **Claimed marks** ([ToU](https://ifs-institute.com/terms-use)): "Internal Family Systems SM", "IFS SM", "IFS Certified™", "IFS Approved™", "IFS Training TM". The site uses ℠ symbols throughout the help center.
- **Restriction on third-party use** ([ToU](https://ifs-institute.com/terms-use)): marks "may not be used in connection with any product or service that is not provided by Company in any manner that is likely to cause confusion among customers, or in any manner that disparages or discredits Company."
- **Credentials** ([Credentials ToU](https://ifs-institute.com/Credentials-TOU)): "IFS™ Trained" and "IFS™ Informed" are Institute designations.
  - "Only the IFS Institute™ or its affiliated IFS™ International Partners may offer training in INTERNAL FAMILY SYSTEMS™."
  - Using credentials "to imply qualification to offer any training and/or certification program not offered by the IFS Institute™" is prohibited.
  - **Avoid "IFS-informed" as a product claim**, since it echoes an Institute designation.
- **Registrations:**
  - US: an older application, "IFS INTERNAL FAMILY SYSTEMS" (serial 77841547, filed 2009, educational services; status not shown, [Justia](https://trademarks.justia.com/owners/the-center-for-self-leadership-inc-1677452)).
  - US: three applications filed Aug 25, 2023 for IFS, IFS INSTITUTE and INTERNAL FAMILY SYSTEMS (classes 16/41, e-publications and training; [Justia](https://trademarks.justia.com/981/51/internal-family-98151674.html)). Justia's page showed only "New Application" status and may be stale. **Check USPTO TSDR directly.**
  - Canada: "IFS" application 2113731 was still under examination, with a response deadline extended to June 2026 ([CIPO](https://ised-isde.canada.ca/cipo/trademark-search/2113731)).
  - The goods and services cover education and publications, not software or apps. Still, likelihood-of-confusion and descriptiveness of therapy names are legal questions for counsel.
- **Naming guidance** (product reasoning, not legal advice):
  - Use generic terms in features: "Parts," "Inner Parts Map," "Protector check-in," "Self-energy check" (or a neutral "Calm-curious check"), "Polarity dialogue."
  - Reference IFS only descriptively in about or credits pages: "draws on concepts from Internal Family Systems (IFS), developed by Richard Schwartz."
  - Add a non-affiliation disclaimer, mirroring PESI's ([example](https://www.pesi.com/item/how-embrace-suicidal-parts-internal-family-systems-119588)).
  - Do not scrape or train on ifs-institute.com content; the ToU bans automated copying.

---

## 3. Evidence base (as of Oct 2026)

### 3.1 Trials

| Study | Design | N | Comparator | Key results | Notes |
|---|---|---|---|---|---|
| Shadick et al. 2013, *J Rheumatol* 40(11):1831 ([abstract](https://www.jrheum.org/content/40/11/1831)) | RCT, 9 months (group + individual IFS) | 79 (39/40) | Mailed RA education + phone calls | At 9 months, IFS better on pain (−14.9, p=.04), physical function (+14.6, p=.04), joint pain (p=.01), self-compassion (+1.6, p=.03). At 21 months: depressive symptoms −3.2 (p=.01), self-compassion +1.8 (p=.01) | Non-psychiatric population; attention-mismatched control; the basis of the NREPP listing |
| Haddock et al. 2016/2017, *JMFT* ([IFS-I](https://Ifs-institute.com/resources/research/efficacy-internal-family-systems-therapy-treatment-depression-among-female)) | Pilot RCT, female college students | 32 (17 IFS / 15 TAU) | TAU = CBT or IPT | Both groups improved; **no significant between-group difference** | 4 of 5 IFS therapists had less than 1 year of IFS experience; more than half of TAU participants were on antidepressants vs. none in IFS |
| Hodgdon et al. 2021/2022, *J Aggression, Maltreatment & Trauma* ([IFS-I](https://ifs-institute.com/resources/research/internal-family-systems-ifs-therapy-posttraumatic-stress-disorder-ptsd-among)) | Uncontrolled pilot; 16 × 90-min sessions | 17 | None | "92% no longer met criteria for PTSD" at 1-month follow-up ([Foundation](https://www.foundationifs.org/research)); also improvements in depression, dissociation, self-compassion and interoceptive awareness (MAIA) | No control group |
| Comeau / Schuman-Olivier et al. 2024, *Psychol Trauma* (PARTS; [IFS-I](https://ifs-institute.com/resources/research/online-group-based-internal-family-systems-treatment-ptsd-feasibility-and)) | Single-arm stage 1; 16 weeks online group + 8 individual sessions | ~15 | None | CAPS-5 d=−0.7 at week 16 and −0.9 at week 24; 53% had a ≥10-point reduction | Decentering, self-compassion and emotion regulation also improved |
| Ally et al. 2025, *Front Psychiatry* 16:1544435 (PARTS-SUD; [full text](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2025.1544435/full)) | Single-arm, 12-week online group | 10 | None | PCL-5 −1.7 points/week; craving and PROMIS depression/anxiety decreased; 70% completion | Mechanism measures: DERS, EQ-Decentering, NADA |
| **Joss et al. 2026**, *Psychol Trauma* (online Jan 29, 2026; doi 10.1037/tra0002089; PARTS RCT; [CHA](https://www.chacmc.org/publications); [Foundation](https://foundationifs.org/about/news/268-another-foundation-funded-study-published-randomized-controlled-trial-on-the-effects-of-the-ifs-focused-program-for-alleviating-and-resolving-trauma-and-stress-parts); [Sweezy, PT](https://www.psychologytoday.com/us/blog/internal-family-systems-therapy-for-shame-and-guilt/202603/study-group-based-online-ifs)) | Pilot RCT, 16-week online group | 60 (30/30) | Nature-Based Stress Reduction for Trauma Survivors (attention/active control) | "Both... statistically significant large reductions in PTSD symptoms" (CAPS-5). PARTS had better attendance (12.8 vs ~10 of 16) and satisfaction | **The Foundation's and Sweezy's summaries describe no between-group superiority on PTSD.** One CHA blurb says "significantly greater reductions"; the two summaries conflict, so check the full text. Registry NCT05095428 lists 82 enrolled ([registry](https://ctv.veeva.com/study/program-for-alleviating-and-resolving-trauma-and-stress2)) |
| Waypoint Centre (Ontario), NCT07342907 ([listing](https://www.withpower.com/trial/phase-borderline-personality-disorder-1-2026-9f215)) | Single-arm BPD pilot, recruiting 2026 | 15 | None | Up to 50 weekly sessions over 12–15 months | Excludes concurrent psychotherapy (i.e., not alongside DBT) |
| Adolescents in out-of-home care (PubMed 42241954) | Mixed-methods IFS-based group | — | — | — | Not retrieved; title only |

The IFS Institute's own summary: "reductions in depression are the only mental health condition that has demonstrated statistically significant improvement across multiple pilot RCTs" ([IFS-I Research](https://ifs-institute.com/resources/research)). Note that Haddock found no difference versus active treatment.

**Scoping review** (Buys 2025, *Clinical Psychologist*): 27 studies — "two RCTs, five quasi-experimental studies, and 17 case studies." Promising for PTSD, depression, and chronic pain; "further large-scale, rigorous studies are needed" ([as summarized by Sentio](https://sentio.org/blog/internal-family-systems-ifs-what-mft-students-should-know)). Primary text was blocked (403).

**BPD:** a 2026 systematic review of DBT, MBT and IFS for BPD with comorbid depression/anxiety found "no studies examined IFS outcomes" ([Francis, Fino & Heym 2026, *J Psychiatr Res* 194:221–232](https://irep.ntu.ac.uk/id/eprint/55128/)).

### 3.2 NREPP history

- In 2015 SAMHSA's NREPP listed IFS, based on Shadick 2013.
  - "Effective" for general functioning and well-being.
  - "Promising" for depression, anxiety (phobia, panic, GAD), physical health conditions, and personal resilience/self-concept ([Sentio](https://sentio.org/blog/internal-family-systems-ifs-what-mft-students-should-know); [Wikipedia](https://en.wikipedia.org/wiki/Internal_Family_Systems_Model)).
- NREPP was discontinued in 2018.
- **Caveat:** the "evidence-based" label rests on a single RA trial in a non-psychiatric population.

### 3.3 Mechanisms

- No dismantling or mediation studies isolating unburdening, Self-energy, or protector befriending were found.
- PARTS studies measure plausible mediators (decentering, self-compassion, emotion regulation, nondual awareness) but have not reported formal mediation.
- The Foundation for Self-Leadership says it is developing adherence and IFS-specific scales ([Foundation](https://www.foundationifs.org/research)).

### 3.4 Critiques

- **Evidence-to-marketing gap.** "A strikingly small evidence-base in the literature." Massive social-media diffusion: about 45,764 Psychology Today therapists list IFS; about 3M TikTok posts ([Brownstone, Hunsicker & Greene 2024](https://societyforpsychotherapy.org/internal-family-systems-exploring-its-problematic-popularity/)).
- **Recovered memory / suggestibility.**
  - Castlewood, above.
  - The Cut, "The Truth About IFS, the Therapy That Can Break You" (Rachel Corbett, Oct 2025; [Alsana Wikipedia](https://en.wikipedia.org/wiki/Alsana); [Ferney response PDF](https://www.ferneytherapy.ie/wp-content/uploads/2026/01/Response-to-the-Cut-3.pdf)). The article page was blocked to my fetcher.
  - The Institute's rebuttal of Nov 4, 2025 calls Castlewood unrepresentative and restates the corroboration principle ([IFS-I](https://ifs-institute.com/news-events/news/response-new-york-magazine-article)).
- **Self as quasi-spiritual construct.** Schwartz increasingly frames Self spiritually; the UB and "entities" material (1.8) amplifies this.
  - Self is unfalsifiable as described. No measure separates "Self" from trained calm or compliance.
  - Self-report inflates with IFS fluency ([Parts Companion](https://partscompanion.org/research)).
- **Reification and fragmentation** (2.2). DID-community objections to a single-Self assumption.
- **Training and rigidity** critiques from a psychiatric-survivor perspective ([Mad in America, Jul 8, 2025](https://www.madinamerica.com/2025/07/a-mad-perspective-on-ifs-training/)).
- **Honest synthesis:** IFS is a promising, coherent, highly acceptable model with:
  - one small rigorous-ish RCT in RA;
  - one small active-controlled PTSD RCT showing parity on symptoms and better engagement;
  - no mechanism data;
  - no BPD data;
  - unstudied adverse events.

  For a DBT app, IFS is best positioned as an **engagement and relational-stance layer** on top of DBT's evidence-based skills, not as the active treatment.

---

## 4. IFS and DBT integration; adjacent parts-like models

### 4.1 Published integration

- **No peer-reviewed IFS + DBT integration paper or trial was found.**
- The IFS bibliography has no BPD or DBT entries ([IFS-I bibliography](https://ifs-institute.com/resources/research/ifs-bibliography-apa-style)).
- Grey literature: IFS Guide's blog (Jul 2026) frames resistance to DBT skills as protector activity and Self as akin to Wise Mind. It has no citations and is a vendor blog ([IFS Guide](https://www.ifsguide.com/ifs-blog/combining-ifs-and-dbt)).
- Anderson teaches "embracing suicidal parts" as protectors in PESI CE products, labelled as not affiliated with the IFS Institute ([PESI](https://www.pesi.com/item/how-embrace-suicidal-parts-internal-family-systems-119588)).
- **Janina Fisher's TIST** (Trauma-Informed Stabilization Treatment) is the most relevant clinical precedent for parts language with self-destructive, BPD-like clients.
  - It is built on structural dissociation, sensorimotor psychotherapy, and mindfulness, and is phase-oriented with stabilization first ([IPTrauma](https://iptrauma.org/docs/evidence-based-trauma-therapies-and-models/trauma-informed-stabilization-treatment-tist)).
  - Fisher frames borderline dynamics as attach vs. fight (and flight/freeze/submit) parts, with the core skill to "notice the part, then notice you noticing" ([How We Can Heal, Mar 11, 2026](https://howwecanheal.buzzsprout.com/1889915/episodes/18827705-borderline-dynamics-through-a-trauma-dissociation-informed-lens-with-dr-janina-fisher)).
  - Its evidence is practice-based only.
- Wise Mind (DBT; Behavioral Tech): "being able to go deep within and intuitively know what the most effective course of action is to pursue," present in everyone even if obscured ([Behavioral Tech, Mar 3, 2020](https://behavioraltech.org/?p=51044)).

### 4.2 Conceptual mapping (my synthesis, not sourced doctrine)

| DBT construct | IFS analogue | Caveat |
|---|---|---|
| Wise Mind (synthesis of emotion mind and reasonable mind) | Self / Self-led | Wise Mind is a *state reached by practice*. IFS Self is posited as *innate and undamageable*, with parts obscuring it. Emotion mind ≈ blended with an exile or firefighter; reasonable mind ≈ some managers |
| Chain analysis (vulnerabilities → prompting event → links → problem behavior → consequences) | Trailhead → triggered exile → firefighter behavior; manager links before it | Firefighter = urge or problem behavior; prompting event ≈ exile trigger; the vulnerability factors (PLEASE) are system-level. Ask each link's "job" and "fear" |
| Urges / target behaviors (self-harm, binge, substance use) | Firefighters | IFS says firefighters can't be eliminated, only relieved. DBT keeps behavioral targets: be explicit that understanding a part ≠ permitting the behavior |
| Validation (6 levels) | Self-energy toward parts; implicit direct access | Validation of the part's *intent* and *fear*, not its method |
| Dialectical dilemmas (emotional vulnerability vs. self-invalidation; active passivity vs. apparent competence; unrelenting crisis vs. inhibited grieving) | Polarizations | Both models seek synthesis rather than one pole winning |
| Self-invalidation / judgmental thoughts | Inner critic types (Earley & Weiss) | Map critic subtypes to DBT nonjudgmental stance and opposite action |
| Distress tolerance (TIPP, STOP) | Unblending; tools when a protector won't step back | Use DBT skills as the **exit ramp** from flooding |
| Opposite action | Protector "updating"; new roles | — |

### 4.3 Schema therapy modes — the validated parts-like model

The **Schema Mode Inventory (SMI, short form)** [[Lobbestael et al. 2010, *Behav Cogn Psychother* 38:437–458](https://www.maastrichtuniversity.nl/sites/default/files/ppp/70009612/SMI%20validation_Lobbestael%2Cvreeswijk%2Cspinhoven%2Cschouten%2Cartnz_BCP2010.pdf)]:
- 118 items, 6-point frequency scale.
- N=863 (non-patients, Axis I and Axis II).
- 14-factor CFA (CFI .980, RMSEA .053); α .79–.96.
- The 14 modes:
  - Vulnerable Child, Angry Child, Enraged Child, Impulsive Child, Undisciplined Child, Happy Child
  - Compliant Surrender, Detached Protector, Detached Self-Soother, Self-Aggrandizer, Bully and Attack
  - Punitive Parent, Demanding Parent
  - Healthy Adult
- **Licensing:** permission is required from the Schema Therapy Institute ([schematherapy.com](https://schematherapy.com/id49.htm)).

Rough correspondence (synthesis):

| Schema mode(s) | IFS analogue |
|---|---|
| Punitive / Demanding Parent | Inner-critic managers (Destroyer/Guilt-Tripper; Taskmaster/Perfectionist) |
| Compliant Surrender | People-pleaser manager |
| Detached Protector / Detached Self-Soother | Dissociative or soothing firefighters |
| Vulnerable Child | Exile |
| Healthy Adult | Closest to Self — but *built*, not uncovered |

Schema therapy's BPD evidence is far stronger than IFS's:
- Arntz et al. 2022, *JAMA Psychiatry*: N=495 across 15 sites. Combined individual + group schema therapy beat TAU (d=1.14) and predominantly-group schema therapy (d=0.84) on BPDSI-IV ([summary](https://blogs.the-hospitalist.org/index.php/content/borderline-personality-disorder-there-optimal-therapy); [PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8892362/)).
- Mode change has been studied as a **mechanism**: Healthy Adult and Vulnerable Child modes were central to reductions in PD severity (Yakın et al. 2026, *J Behav Ther Exp Psychiatry* 90:102074; [UvA](https://dare.uva.nl/id/bcac3aa2-acd4-4c8c-b884-5f11a4f933b7)).
- **This is the mechanism-level evidence IFS lacks.**

### 4.4 Ego-state therapy and Compassion Focused Therapy

- **Ego-state therapy (Watkins).** An ego state is "an organized system of behavior and experience, whose elements are bound together by common principle." It descends from Federn, sometimes uses hypnosis, and has no RCTs ([Wikipedia](https://en.wikipedia.org/wiki/Ego-state_therapy)).
- **CFT "multiple selves"** (Gilbert; Kolts). Clients explore threat-based selves (angry, anxious, sad) for "their history, purpose and function." The **compassionate self** is a "superordinate version of the self that is organised by the processes of compassion" — the "captain of the ship" ([Kolts/ACBS, Dec 13, 2024](https://contextualscience.org/node/49817)).
  - Like Schema's Healthy Adult, the compassionate self is **cultivated**.
  - This framing is more compatible with DBT's skills-acquisition model than IFS's innate-Self claim.
  - [memory] CFT's FSCRS (Forms of Self-Criticising/Attacking & Self-Reassuring Scale; Gilbert et al. 2004) maps directly onto inner-critic vs. inner-champion. Verify licensing.

---

## 5. Measurement instruments

| Instrument | What it measures | Status |
|---|---|---|
| **IFS Scale** (DeLand, Strongin & Schwartz 2003, *J Self Leadership* 2(1); [PDF](https://www.ifs-scale.com/wp-content/uploads/2022/12/Final-article.pdf); [IFS-I page](https://ifs-institute.com/resources/research/ifs-scale)) | 57 items, 5-point scale, 10 subscales: Pleasing/Abandoned, Addictive/Impulsive, Anxious/Pessimistic, Dissociating, Exiles, Raging, Self-Critical, Self-Harming, composite Parts, Self. **Separate 25-item Self Scale** (α .97) with sub-factors Self-Qualities and Self-Leadership | N=1,174 convenience sample (≈76–77% female, 84% White), self-selected high-trauma. α .83–.98; 9 factors explaining 68.7% of variance; parts correlate positively with each other and negatively with Self. In-house journal; no independent replication or clinical-sensitivity data found. Example items: Self — "I feel balanced and calm"; Exile — "I feel like I'm falling apart." **The only IFS-native self-report found** |
| **Parts Companion process measure** ([site](https://partscompanion.org/research)) | Observer-rated (human + LLM): unblending, Self-energy, Self-to-part relationship, 6F progression, unburdening durability | In development; explicitly not validated |
| **Self-Compassion Scale** (26 items) / **SCS-SF** (12 items; Raes et al. 2011) ([info](https://self-compassion.org/wp-content/uploads/2021/03/SCS-SF-information.pdf)) | Self-kindness, common humanity, mindfulness vs. their negative poles | Used in Shadick, Hodgdon and PARTS. SCS-SF: "permission to use... for any purpose whatsoever." Best free proxy for the Self-to-part stance. State SCS forms exist ([self-compassion.org](https://self-compassion.org/self-compassion-scales/)) |
| **Experiences Questionnaire – Decentering; NADA; DERS** | Decentering, nondual awareness, emotion-regulation difficulties | Used as mechanism measures in PARTS-SUD ([Ally 2025](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2025.1544435/full)); DERS is already DBT-native |
| **MAIA** | Interoceptive awareness | Used in Hodgdon 2021 ([IFS-I](https://ifs-institute.com/resources/research/internal-family-systems-ifs-therapy-posttraumatic-stress-disorder-ptsd-among)) |
| **SMI** | 14 schema modes, incl. Healthy Adult | Best-validated parts-like instrument; licensed (4.3) |
| "Self-Leadership Scale" | **Not IFS.** The name collides with an organizational-psychology construct (Manz; Houghton & Neck). A 2024 SPU IFS-coaching poster used "the Self-Leadership Scale" ([SPU](https://digitalcommons.spu.edu/spfc_research_conference/spfc_conf_2024/spfc_conf_2024_events/4)) | Do not treat as an IFS Self measure |
| "Self-Energy Scale" / "Self-Leadership Inventory" | — | **Not found** as validated IFS instruments. Only worksheets exist (e.g., 8 Cs worksheets) |

---

## 6. Implications for product flows (recommendations from the evidence above)

1. **Scope tiers.**
   - In-app: parts noticing and journaling; protector befriending via the 6 Fs; inner-critic work; gentle polarization dialogue.
   - Gated, therapist-linked, or excluded: exile witnessing, do-over, retrieval and unburdening. Exclude legacy-burden rituals. Exclude unattached burdens entirely.
2. **Use "feel toward" as the runtime gate.** After the user describes a part, ask how they feel toward it.
   - Non-C affect: run the concerned-part step-back loop, with a max iteration count.
   - Still blended, or flooding signals: exit to DBT distress tolerance (TIPP, paced breathing, grounding). Do not push forward.
   - Do not accept C-words alone as evidence of Self (IFS-fluency inflation).
3. **Treat behavior-derived parts as hypotheses ("trailheads"), never assertions.**
   - Let the user confirm, name and describe parts.
   - Avoid prompts implying hidden exiles or memories ("what happened to you when...").
   - Encode the Institute's own rule that new or recovered memories are not facts without corroboration.
4. **Profile schema for a part:**
   - name/label (user's words)
   - type hypothesis (manager / firefighter / exile-adjacent; Earley critic subtype or pattern)
   - somatic location
   - image and age
   - trailheads and triggers (linked to DBT diary-card items and chain links)
   - job, positive intent, feared outcome
   - perceived age of the user (for updating)
   - polarization links
   - preferred role
   - trust or relationship log
   - last check-in
   - Glass's "catalogue card" and "biography" are good templates.
5. **Use protector fears as safety detectors.** Fears 3 (dangerous firefighters) and 8 (exile hurt again) should trigger safety planning and crisis resources, not continued exploration.
6. **Watch for backlash** with 24–72 h post-session check-ins. Use the "3–4 weeks" re-check idea for protectors after any significant shift.
7. **Screening gates:** dissociation (DES-II or similar), psychosis or reality-testing concerns, and active suicidality route to clinician-guided mode only.
8. **Outcomes:** prefer validated, licensable measures — SCS-SF (free), DERS, EQ-Decentering, and SMI if licensed — over the unreplicated IFS Scale. Use the IFS Scale's Self subscale at most as an exploratory secondary measure. Even research use should go through the Institute's permission process, given its ToU.
9. **Naming:** no "IFS" in feature names; non-affiliation disclaimer; counsel review.

---

## Sources

**IFS Institute and Foundation**
- IFS Institute home — https://ifs-institute.com/
- About — https://ifs-institute.com/about-us
- Research — https://ifs-institute.com/resources/research
- Terms of Use — https://ifs-institute.com/terms-use
- Credentials ToU — https://ifs-institute.com/Credentials-TOU
- Certification policy — https://ifs-institute.com/ifs-certification/ifs-certification-policy
- Level 1 learning objectives (2024) — https://ifs-institute.com/sites/default/files/inline-files/Learning%20Objectives%20IFS%20Level%201%20Training%20with%204%20multi-day%20sessions%20and%202%20single-day%20sessions%206.10.24.pdf
- Level 1 brochure (2026) — https://ifs-institute.com/sites/default/files/training-brochure/na/1596%20IFS%20Training%20Brochure%207.6.26.pdf
- Booth protector-fears PDF — https://ifs-institute.com/sites/default/files/inline-files/SATURDAY_Direct%20Access_Fran%20Booth%20(2).pdf
- Direct Access course — https://learn.ifs-institute.com/programs/direct-access-an-essential-ifs-skill-with-frances-booth-and-dick-schwartz/modules/module-3-addressing-protector-fears
- Admissions change, Feb 2024 — https://Ifs-institute.com/news-events/news/creating-clarity-ifs-level-1-admissions-changes-coming-2024
- Response to New York Magazine, Nov 4, 2025 — https://ifs-institute.com/news-events/news/response-new-york-magazine-article
- News index — https://ifs-institute.com/news-events/news
- May 2026 news — https://ifs-institute.com/news-events/news/ifs-news-growing-recognition-across-media-clinical-practice-and-research
- International partners — https://ifs-institute.com/about-us/international-partners
- IFS bibliography — https://ifs-institute.com/resources/research/ifs-bibliography-apa-style
- IFS Scale page — https://ifs-institute.com/resources/research/ifs-scale
- Daily Parts Meditation (Glass) — https://Ifs-institute.com/store/178
- Resolving Inner Conflict (Earley) — https://Ifs-institute.com/store/155
- Help center — https://info.ifs-institute.com/ifsi-help-center
- Foundation for Self Leadership: research — https://www.foundationifs.org/research
- Foundation: PARTS RCT news — https://foundationifs.org/about/news/268-another-foundation-funded-study-published-randomized-controlled-trial-on-the-effects-of-the-ifs-focused-program-for-alleviating-and-resolving-trauma-and-stress-parts

**Books and tables of contents**
- Schwartz & Sweezy 2nd ed. TOC — https://www.cms.guilford.com/books/Internal-Family-Systems-Therapy/Schwartz-Sweezy/9781462541461/contents
- Shortform summary — https://www.shortform.com/pdf/internal-family-systems-therapy-pbp18613-b-pdf-richard-c-schwartz-and-martha-sweezy
- Sweezy, *Shame and Guilt* — https://guilford.com/books/Internal-Family-Systems-Therapy-for-Shame-and-Guilt/Martha-Sweezy/9781462552467/author

**Clinical mechanics (handouts, transcripts, summaries)**
- Anderson, 6 Fs (PESI) — https://pesi.com/blog/details/1511/6-step-ifs-process-to-jumpstart-healing
- UNC/Klinger handouts — https://cls.unc.edu/wp-content/uploads/sites/3019/2020/03/Handouts-for-IFS.pdf
- UWSP 2020 slides — https://www3.uwsp.edu/conted/Anon/MHSUR%202020%20Presentations/28%20-%20Introduction%20to%20Internal%20Family%20Systems%20Therapy%20An%20Evidence-Based%20Model.pdf
- Neustadt direct-access transcript — https://www.internalfamilysystems.pt/sites/default/files/2022/docs/media/The%20Gifts%20of%20our%20Protectors%20and%20Direct%20Access%20with%20Paul%20Neustadt-transcript.pdf
- Twombly transcript — https://internalfamilysystems.pt/sites/default/files/2022/docs/media/Trauma%20and%20Dissociation%20Informed%20IFS%20with%20Joanne%20Twombly-transcript.pdf
- Schwartz on System Speak — https://systemspeakpodcast.com/t-guest-schwartz
- Earley summaries — https://notes.andymatuschak.org/zCAUiGe5aHakEY2F6YMdamU ; https://www.antoinebuteau.com/self-therapy-book-summary.md
- Earley, Pattern System PDF — https://s3.amazonaws.com/STJ/E14-PDF-The-Pattern-System.pdf
- Seven Types of Inner Critics — https://static1.squarespace.com/static/5c03ced75ffd204418037b7a/t/5c3fe62b7ba7fc1e43005c7f/1547691563363/Seven+Types+of+Inner+Critics.pdf
- Inner-critic types (Molder naming) — https://www.goodreads.com/author_blog_posts/17598226-the-7-types-of-inner-critic-which-one-s-do-you-recognise?tab=book
- Taeubert polarization outline — https://www.pesicanada.ca/item/ifs-polarization-172578
- Unburdening steps — https://sequencewiz.org/2023/05/24/connecting-to-the-vulnerable-parts-and-releasing-their-burdens-into-the-elements/ ; https://en.lucasforstmeyer.com/internal-family-system-ifs/ifs-course-12/ ; https://www.wayofbelonging.com/post/steps-for-healing-an-exile-in-ifs
- Sweezy Q&A — https://psychwire.com/free-resources/q-and-a/5axjlz/understanding-internal-family-systems
- Derek Scott, Psyche — https://psyche.co/guides/how-to-get-to-know-and-love-all-the-parts-of-your-self%20
- Legacy burdens — https://www.soundstrue.com/a/resources/transcript/richard-schwartz-and-tamala-floyd-healing-across-generations-ifs-ancestral-wisdom/ ; https://pesi.co.uk/blogs/legacy-burdens-ifs-energy-work-and-intergeneratio
- Unattached burdens — https://www.aubreymarcus.com/blogs/aubrey-marcus-podcast/life-changing-therapy-healing-parts-revealing-entities-ifs-founder-dr-richard-schwartz-502 ; https://gwern.net/doc/www/www.astralcodexten.com/a95626987212445f8bb5a4268862f1ae6cf839e4.html
- Anderson, suicidal parts (PESI) — https://www.pesi.com/item/how-embrace-suicidal-parts-internal-family-systems-119588
- Anderson, Transcending Trauma (PESI) — https://www.pesi.com/item/201-transcending-trauma-ifs-165447
- Updating episode — https://nl.player.fm/series/purely-ifs-with-emma-and-gayle/updating-and-meeting-self-part-1

**Evidence**
- Shadick 2013 — https://www.jrheum.org/content/40/11/1831
- Haddock — https://Ifs-institute.com/resources/research/efficacy-internal-family-systems-therapy-treatment-depression-among-female
- Hodgdon — https://ifs-institute.com/resources/research/internal-family-systems-ifs-therapy-posttraumatic-stress-disorder-ptsd-among
- Comeau 2024 — https://ifs-institute.com/resources/research/online-group-based-internal-family-systems-treatment-ptsd-feasibility-and
- Ally 2025 — https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2025.1544435/full
- Joss 2026 (PubMed) — https://pubmed.ncbi.nlm.nih.gov/41609644/
- CHA publications — https://www.chacmc.org/publications
- Sweezy, Psychology Today (RCT) — https://www.psychologytoday.com/us/blog/internal-family-systems-therapy-for-shame-and-guilt/202603/study-group-based-online-ifs
- Sweezy, Psychology Today (proof of concept) — https://www.psychologytoday.com/us/blog/internal-family-systems-therapy-for-shame-and-guilt/202603/an-ifs-therapy-program-for-ptsd-a
- PARTS2 registry — https://ctv.veeva.com/study/program-for-alleviating-and-resolving-trauma-and-stress2
- Waypoint BPD trial — https://www.withpower.com/trial/phase-borderline-personality-disorder-1-2026-9f215
- Francis et al. 2026 — https://irep.ntu.ac.uk/id/eprint/55128/
- Sentio summary (NREPP, Buys 2025) — https://sentio.org/blog/internal-family-systems-ifs-what-mft-students-should-know
- Wikipedia: IFS — https://en.wikipedia.org/wiki/Internal_Family_Systems_Model

**Critiques and controversy**
- Brownstone et al. 2024 — https://societyforpsychotherapy.org/internal-family-systems-exploring-its-problematic-popularity/
- Wikipedia: Alsana (Castlewood) — https://en.wikipedia.org/wiki/Alsana
- News Tribune 2013 — https://www.newstribune.com/news/2013/dec/17/implanted-memory-suits-may-be-near-dismissal/
- Ferney response PDF — https://www.ferneytherapy.ie/wp-content/uploads/2026/01/Response-to-the-Cut-3.pdf
- Nondual IFS response — https://nondualifs.substack.com/p/a-clinical-and-methodological-analysis
- Mad in America — https://www.madinamerica.com/2025/07/a-mad-perspective-on-ifs-training/
- Healing My Parts (DID) — https://healingmyparts.substack.com/p/whats-the-scoop-about-ifs-for-did
- IPTrauma (parts vs ego state vs structural dissociation) — https://iptrauma.org/docs/body-of-knowledge-of-psychotraumatology/parts-theory-ego-state-theory-and-structural-dissociation-differences-overlaps-and-clinical-implications-for-trauma

**Trademarks**
- Justia, 2023 applications — https://trademarks.justia.com/owners/the-center-for-self-leadership-inc-5628888
- Justia, INTERNAL FAMILY SYSTEMS — https://trademarks.justia.com/981/51/internal-family-98151674.html
- Justia, 2009 application — https://trademarks.justia.com/owners/the-center-for-self-leadership-inc-1677452
- CIPO 2113731 — https://ised-isde.canada.ca/cipo/trademark-search/2113731

**Apps and AI**
- IFS Guide — https://www.ifsguide.com/
- IFS Guide, DBT blog — https://www.ifsguide.com/ifs-blog/combining-ifs-and-dbt
- Harmony — https://www.harmonyappai.com/
- IFS Buddy — https://www.ifsbuddy.chat/
- Parts Companion — https://partscompanion.org/research
- The One Inside — https://theoneinside.substack.com/p/ifs-in-the-ai-age-a-live-conversation

**DBT, schema therapy, CFT, ego state, TIST**
- Behavioral Tech, Wise Mind — https://behavioraltech.org/?p=51044
- SMI validation — https://www.maastrichtuniversity.nl/sites/default/files/ppp/70009612/SMI%20validation_Lobbestael%2Cvreeswijk%2Cspinhoven%2Cschouten%2Cartnz_BCP2010.pdf
- SMI (Cambridge) — https://www.cambridge.org/core/journals/behavioural-and-cognitive-psychotherapy/article/abs/reliability-and-validity-of-the-short-schema-mode-inventory-smi/4F6A19E8D053558DB2F2F6FDBD2E48CA
- Schema Therapy Institute — https://schematherapy.com/id49.htm
- Arntz 2022 — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8892362/ ; https://blogs.the-hospitalist.org/index.php/content/borderline-personality-disorder-there-optimal-therapy
- Yakın 2026 — https://dare.uva.nl/id/bcac3aa2-acd4-4c8c-b884-5f11a4f933b7
- CFT multiple selves (Kolts) — https://contextualscience.org/node/49817
- Ego-state therapy — https://en.wikipedia.org/wiki/Ego-state_therapy
- TIST — https://iptrauma.org/docs/evidence-based-trauma-therapies-and-models/trauma-informed-stabilization-treatment-tist
- Fisher on borderline dynamics — https://howwecanheal.buzzsprout.com/1889915/episodes/18827705-borderline-dynamics-through-a-trauma-dissociation-informed-lens-with-dr-janina-fisher

**Measurement**
- IFS Scale paper — https://www.ifs-scale.com/wp-content/uploads/2022/12/Final-article.pdf
- SCS-SF info — https://self-compassion.org/wp-content/uploads/2021/03/SCS-SF-information.pdf
- Self-compassion scales — https://self-compassion.org/self-compassion-scales/
- SPU self-leadership poster — https://digitalcommons.spu.edu/spfc_research_conference/spfc_conf_2024/spfc_conf_2024_events/4

**Open items to verify before shipping**
1. Exact book wording for the 6 Fs, the updating protocol, and Self-like parts.
2. The Institute's "eight steps" of unburdening.
3. Verbatim self-help cautions in *No Bad Parts* and Earley's *Self-Therapy*.
4. PARTS RCT between-group statistics (full text).
5. Current USPTO status of the 2023 marks.
6. The Pattern System pairings against the book.
7. Licensing for SMI, DES-II and FSCRS.
8. Whether Mind Beyond actually endorses IFS Buddy.