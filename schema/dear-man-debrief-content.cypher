// ============================================================
// DEAR MAN Debrief — Chain Analysis + Cope-Ahead Content
// Run with MERGE for idempotency. Safe to re-run.
// ============================================================

// ── Constraints ──

CREATE CONSTRAINT IF NOT EXISTS FOR (tp:TurningPoint) REQUIRE tp.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (mr:MomentResponse) REQUIRE mr.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (bs:BodySignal) REQUIRE bs.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (tp2:ThoughtPattern) REQUIRE tp2.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (u:Underneath) REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (r:Reflection) REQUIRE r.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (ca:CopeAhead) REQUIRE ca.id IS UNIQUE;

// ── Overall debrief response text on TherapyConcept ──

MATCH (tc:TherapyConcept {id: 'dbt_dear_man'})
SET tc.debriefResponseBad = "That takes a lot of honesty. Let's look at what happened so you can walk away with something useful.",
    tc.debriefResponseMixed = "Mixed is actually really normal. Let's pull apart what happened.",
    tc.debriefResponseGood = "That's great. Let's make sure you can do it again.",
    tc.debriefResponseNotYet = "Good — you're already thinking about it. Want to prepare, or walk through what you're worried about?";

// ── TurningPoint nodes ──

MERGE (tp:TurningPoint {id: 'tp_defensive'})
SET tp.label = 'They got defensive',
    tp.validationText = "That's one of the hardest things to stay grounded through.",
    tp.sortOrder = 1;

MERGE (tp:TurningPoint {id: 'tp_crying_shutdown'})
SET tp.label = 'I started crying or shutting down',
    tp.validationText = "Your body was trying to protect you. That's not weakness.",
    tp.sortOrder = 2;

MERGE (tp:TurningPoint {id: 'tp_apologized'})
SET tp.label = 'I apologized when I didn\'t need to',
    tp.validationText = "That's such a common pattern. It's hard to hold your ground when guilt shows up.",
    tp.sortOrder = 3;

MERGE (tp:TurningPoint {id: 'tp_no_words'})
SET tp.label = 'I couldn\'t find the words',
    tp.validationText = "When emotions are high, the language centers literally go offline. That's neuroscience, not failure.",
    tp.sortOrder = 4;

MERGE (tp:TurningPoint {id: 'tp_gave_in'})
SET tp.label = 'I gave in to keep the peace',
    tp.validationText = "That impulse makes sense — your brain was prioritizing safety. Let's look at what was underneath.",
    tp.sortOrder = 5;

MERGE (tp:TurningPoint {id: 'tp_escalated'})
SET tp.label = 'It escalated quickly',
    tp.validationText = "When things escalate, it usually means something important was at stake for both of you.",
    tp.sortOrder = 6;

MERGE (tp:TurningPoint {id: 'tp_went_okay'})
SET tp.label = 'Actually, it went okay',
    tp.validationText = "Let's figure out what you did right so you can repeat it.",
    tp.sortOrder = 7;

MERGE (tp:TurningPoint {id: 'tp_something_else'})
SET tp.label = 'Something else',
    tp.validationText = "Every conversation has its own shape. Let's look at what was happening for you.",
    tp.sortOrder = 8;

// ── MomentResponse nodes ──
// These represent what the user did IN that turning-point moment.

MERGE (mr:MomentResponse {id: 'mr_froze'})
SET mr.label = 'I froze up',
    mr.sortOrder = 1;

MERGE (mr:MomentResponse {id: 'mr_got_loud'})
SET mr.label = 'I got loud or intense',
    mr.sortOrder = 2;

MERGE (mr:MomentResponse {id: 'mr_went_quiet'})
SET mr.label = 'I went quiet',
    mr.sortOrder = 3;

MERGE (mr:MomentResponse {id: 'mr_cried'})
SET mr.label = 'I cried',
    mr.sortOrder = 4;

MERGE (mr:MomentResponse {id: 'mr_changed_subject'})
SET mr.label = 'I changed the subject',
    mr.sortOrder = 5;

MERGE (mr:MomentResponse {id: 'mr_agreed'})
SET mr.label = 'I agreed with them',
    mr.sortOrder = 6;

MERGE (mr:MomentResponse {id: 'mr_left'})
SET mr.label = 'I left / ended it',
    mr.sortOrder = 7;

MERGE (mr:MomentResponse {id: 'mr_stayed_course'})
SET mr.label = 'I stayed on course',
    mr.sortOrder = 8;

// ── RESPONDS_TO relationships (MomentResponse → TurningPoint) ──
// All MomentResponses can follow any TurningPoint EXCEPT tp_went_okay

MATCH (mr:MomentResponse), (tp:TurningPoint)
WHERE tp.id <> 'tp_went_okay'
MERGE (mr)-[:RESPONDS_TO]->(tp);

// ── BodySignal nodes ──

MERGE (bs:BodySignal {id: 'bs_chest_tight'})
SET bs.label = 'Chest got tight',
    bs.sortOrder = 1;

MERGE (bs:BodySignal {id: 'bs_stomach_drop'})
SET bs.label = 'Stomach dropped',
    bs.sortOrder = 2;

MERGE (bs:BodySignal {id: 'bs_face_hot'})
SET bs.label = 'Face got hot',
    bs.sortOrder = 3;

MERGE (bs:BodySignal {id: 'bs_hands_shaking'})
SET bs.label = 'Hands were shaking',
    bs.sortOrder = 4;

MERGE (bs:BodySignal {id: 'bs_throat_closed'})
SET bs.label = 'Throat closed up',
    bs.sortOrder = 5;

MERGE (bs:BodySignal {id: 'bs_numb'})
SET bs.label = 'Went numb',
    bs.sortOrder = 6;

MERGE (bs:BodySignal {id: 'bs_heart_racing'})
SET bs.label = 'Heart was racing',
    bs.sortOrder = 7;

MERGE (bs:BodySignal {id: 'bs_jaw_clenched'})
SET bs.label = 'Jaw clenched',
    bs.sortOrder = 8;

MERGE (bs:BodySignal {id: 'bs_shoulders_up'})
SET bs.label = 'Shoulders went up',
    bs.sortOrder = 9;

MERGE (bs:BodySignal {id: 'bs_none'})
SET bs.label = 'I didn\'t notice anything',
    bs.sortOrder = 10;

// ── ThoughtPattern nodes ──

MERGE (tp2:ThoughtPattern {id: 'thought_not_worth'})
SET tp2.label = 'This isn\'t worth the fight',
    tp2.theme = 'avoidance',
    tp2.sortOrder = 1;

MERGE (tp2:ThoughtPattern {id: 'thought_my_fault'})
SET tp2.label = 'This is probably my fault',
    tp2.theme = 'self_blame',
    tp2.sortOrder = 2;

MERGE (tp2:ThoughtPattern {id: 'thought_never_listen'})
SET tp2.label = 'They never listen',
    tp2.theme = 'hopelessness',
    tp2.sortOrder = 3;

MERGE (tp2:ThoughtPattern {id: 'thought_too_much'})
SET tp2.label = 'I\'m being too much',
    tp2.theme = 'self_invalidation',
    tp2.sortOrder = 4;

MERGE (tp2:ThoughtPattern {id: 'thought_cant_handle'})
SET tp2.label = 'I can\'t handle this',
    tp2.theme = 'overwhelm',
    tp2.sortOrder = 5;

MERGE (tp2:ThoughtPattern {id: 'thought_dont_deserve'})
SET tp2.label = 'I don\'t deserve to ask',
    tp2.theme = 'unworthiness',
    tp2.sortOrder = 6;

MERGE (tp2:ThoughtPattern {id: 'thought_should_know'})
SET tp2.label = 'They should just know',
    tp2.theme = 'expectation',
    tp2.sortOrder = 7;

MERGE (tp2:ThoughtPattern {id: 'thought_wrong'})
SET tp2.label = 'What if I\'m wrong?',
    tp2.theme = 'doubt',
    tp2.sortOrder = 8;

MERGE (tp2:ThoughtPattern {id: 'thought_will_leave'})
SET tp2.label = 'They\'re going to leave',
    tp2.theme = 'abandonment',
    tp2.sortOrder = 9;

MERGE (tp2:ThoughtPattern {id: 'thought_something_else'})
SET tp2.label = 'Something else',
    tp2.theme = 'other',
    tp2.sortOrder = 10;

// ── Underneath emotion nodes ──

MERGE (u:Underneath {id: 'under_fear_rejection'})
SET u.label = 'Fear of rejection',
    u.sortOrder = 1;

MERGE (u:Underneath {id: 'under_shame'})
SET u.label = 'Shame',
    u.sortOrder = 2;

MERGE (u:Underneath {id: 'under_grief'})
SET u.label = 'Grief — for how it should be',
    u.sortOrder = 3;

MERGE (u:Underneath {id: 'under_powerlessness'})
SET u.label = 'Powerlessness',
    u.sortOrder = 4;

MERGE (u:Underneath {id: 'under_loneliness'})
SET u.label = 'Loneliness',
    u.sortOrder = 5;

MERGE (u:Underneath {id: 'under_not_sure'})
SET u.label = 'I\'m not sure',
    u.sortOrder = 6;

// ── Reflection nodes ──
// Keyed to (TurningPoint, MomentResponse) pairs via dual relationships.
// Each block uses MATCH for existing target nodes + MERGE for the relationship.

// tp_defensive + mr_froze
MERGE (r:Reflection {id: 'ref_defensive_froze'})
SET r.text = "When someone gets defensive, your nervous system reads it as danger. Freezing isn't giving up — it's your brain hitting pause because the threat level spiked. The skill isn't to never freeze. It's to have a plan for when you do.",
    r.isDefault = false;

MATCH (r:Reflection {id: 'ref_defensive_froze'}), (tp:TurningPoint {id: 'tp_defensive'})
MERGE (r)-[:REFLECTS_ON]->(tp);

MATCH (r:Reflection {id: 'ref_defensive_froze'}), (mr:MomentResponse {id: 'mr_froze'})
MERGE (r)-[:FOR_RESPONSE]->(mr);

// tp_defensive + mr_got_loud
MERGE (r:Reflection {id: 'ref_defensive_loud'})
SET r.text = "When they got defensive, your system matched their intensity. That's not a character flaw — it's mirror neurons doing exactly what they're designed to do. The goal isn't to suppress that. It's to notice the surge before it takes over.",
    r.isDefault = false;

MATCH (r:Reflection {id: 'ref_defensive_loud'}), (tp:TurningPoint {id: 'tp_defensive'})
MERGE (r)-[:REFLECTS_ON]->(tp);

MATCH (r:Reflection {id: 'ref_defensive_loud'}), (mr:MomentResponse {id: 'mr_got_loud'})
MERGE (r)-[:FOR_RESPONSE]->(mr);

// tp_defensive + mr_went_quiet
MERGE (r:Reflection {id: 'ref_defensive_quiet'})
SET r.text = "Going quiet when someone gets defensive is actually a sophisticated self-protection move. Your brain decided the safest option was to stop giving them material. The question is whether that quiet served you, or just served the peace.",
    r.isDefault = false;

MATCH (r:Reflection {id: 'ref_defensive_quiet'}), (tp:TurningPoint {id: 'tp_defensive'})
MERGE (r)-[:REFLECTS_ON]->(tp);

MATCH (r:Reflection {id: 'ref_defensive_quiet'}), (mr:MomentResponse {id: 'mr_went_quiet'})
MERGE (r)-[:FOR_RESPONSE]->(mr);

// tp_crying_shutdown + mr_froze
MERGE (r:Reflection {id: 'ref_crying_froze'})
SET r.text = "Crying and freezing happen when your emotional brain overwhelms your thinking brain. It's not that you couldn't handle it — it's that your system was trying to process too much at once. Next time, you can give yourself permission to pause.",
    r.isDefault = false;

MATCH (r:Reflection {id: 'ref_crying_froze'}), (tp:TurningPoint {id: 'tp_crying_shutdown'})
MERGE (r)-[:REFLECTS_ON]->(tp);

MATCH (r:Reflection {id: 'ref_crying_froze'}), (mr:MomentResponse {id: 'mr_froze'})
MERGE (r)-[:FOR_RESPONSE]->(mr);

// tp_crying_shutdown + mr_cried
MERGE (r:Reflection {id: 'ref_crying_cried'})
SET r.text = "Tears during hard conversations usually mean something really matters to you. That's not dysfunction — that's depth. The skill is learning to keep talking through the tears, or to say 'I need a minute' without abandoning what you need.",
    r.isDefault = false;

MATCH (r:Reflection {id: 'ref_crying_cried'}), (tp:TurningPoint {id: 'tp_crying_shutdown'})
MERGE (r)-[:REFLECTS_ON]->(tp);

MATCH (r:Reflection {id: 'ref_crying_cried'}), (mr:MomentResponse {id: 'mr_cried'})
MERGE (r)-[:FOR_RESPONSE]->(mr);

// tp_apologized + mr_agreed
MERGE (r:Reflection {id: 'ref_apologized_agreed'})
SET r.text = "Apologizing and agreeing when you don't mean it is your nervous system's way of making the discomfort stop. It works in the moment, but it costs you later — because the need doesn't go away. It just goes underground.",
    r.isDefault = false;

MATCH (r:Reflection {id: 'ref_apologized_agreed'}), (tp:TurningPoint {id: 'tp_apologized'})
MERGE (r)-[:REFLECTS_ON]->(tp);

MATCH (r:Reflection {id: 'ref_apologized_agreed'}), (mr:MomentResponse {id: 'mr_agreed'})
MERGE (r)-[:FOR_RESPONSE]->(mr);

// tp_apologized + mr_went_quiet
MERGE (r:Reflection {id: 'ref_apologized_quiet'})
SET r.text = "Apologizing and then going quiet — that's the double move of someone who learned early that their needs create problems. It's not that you don't have a voice. It's that something taught you it wasn't safe to use it.",
    r.isDefault = false;

MATCH (r:Reflection {id: 'ref_apologized_quiet'}), (tp:TurningPoint {id: 'tp_apologized'})
MERGE (r)-[:REFLECTS_ON]->(tp);

MATCH (r:Reflection {id: 'ref_apologized_quiet'}), (mr:MomentResponse {id: 'mr_went_quiet'})
MERGE (r)-[:FOR_RESPONSE]->(mr);

// tp_no_words + mr_froze
MERGE (r:Reflection {id: 'ref_nowords_froze'})
SET r.text = "When emotions flood in, your prefrontal cortex — the part that finds words — literally goes offline. You didn't lose your argument. Your brain just couldn't access it. Having key phrases ready beforehand can bridge that gap.",
    r.isDefault = false;

MATCH (r:Reflection {id: 'ref_nowords_froze'}), (tp:TurningPoint {id: 'tp_no_words'})
MERGE (r)-[:REFLECTS_ON]->(tp);

MATCH (r:Reflection {id: 'ref_nowords_froze'}), (mr:MomentResponse {id: 'mr_froze'})
MERGE (r)-[:FOR_RESPONSE]->(mr);

// tp_no_words + mr_changed_subject
MERGE (r:Reflection {id: 'ref_nowords_changed'})
SET r.text = "Changing the subject when you can't find the words is actually a creative survival move — your brain found an exit when the words couldn't. The skill is having one rehearsed sentence you can reach for in that moment.",
    r.isDefault = false;

MATCH (r:Reflection {id: 'ref_nowords_changed'}), (tp:TurningPoint {id: 'tp_no_words'})
MERGE (r)-[:REFLECTS_ON]->(tp);

MATCH (r:Reflection {id: 'ref_nowords_changed'}), (mr:MomentResponse {id: 'mr_changed_subject'})
MERGE (r)-[:FOR_RESPONSE]->(mr);

// tp_gave_in + mr_agreed
MERGE (r:Reflection {id: 'ref_gavein_agreed'})
SET r.text = "Giving in to keep the peace makes total sense when conflict feels dangerous. But peace bought with your needs is expensive. The goal isn't to fight harder — it's to tolerate the discomfort of holding your ground a little longer.",
    r.isDefault = false;

MATCH (r:Reflection {id: 'ref_gavein_agreed'}), (tp:TurningPoint {id: 'tp_gave_in'})
MERGE (r)-[:REFLECTS_ON]->(tp);

MATCH (r:Reflection {id: 'ref_gavein_agreed'}), (mr:MomentResponse {id: 'mr_agreed'})
MERGE (r)-[:FOR_RESPONSE]->(mr);

// tp_gave_in + mr_left
MERGE (r:Reflection {id: 'ref_gavein_left'})
SET r.text = "Leaving can actually be a wise move — especially if you were about to say something you'd regret. The key is whether you left with a plan to come back, or whether leaving became the end of the conversation.",
    r.isDefault = false;

MATCH (r:Reflection {id: 'ref_gavein_left'}), (tp:TurningPoint {id: 'tp_gave_in'})
MERGE (r)-[:REFLECTS_ON]->(tp);

MATCH (r:Reflection {id: 'ref_gavein_left'}), (mr:MomentResponse {id: 'mr_left'})
MERGE (r)-[:FOR_RESPONSE]->(mr);

// tp_escalated + mr_got_loud
MERGE (r:Reflection {id: 'ref_escalated_loud'})
SET r.text = "When things escalate and you match the intensity, it's because your amygdala read the situation as a real threat. Volume is your nervous system's way of trying to be heard. But it usually pushes the other person further away from hearing you.",
    r.isDefault = false;

MATCH (r:Reflection {id: 'ref_escalated_loud'}), (tp:TurningPoint {id: 'tp_escalated'})
MERGE (r)-[:REFLECTS_ON]->(tp);

MATCH (r:Reflection {id: 'ref_escalated_loud'}), (mr:MomentResponse {id: 'mr_got_loud'})
MERGE (r)-[:FOR_RESPONSE]->(mr);

// tp_escalated + mr_left
MERGE (r:Reflection {id: 'ref_escalated_left'})
SET r.text = "Leaving when things escalate is actually a skill — if it's done intentionally. The difference between storming out and taking a break is one sentence: 'I need to pause. I want to come back to this.'",
    r.isDefault = false;

MATCH (r:Reflection {id: 'ref_escalated_left'}), (tp:TurningPoint {id: 'tp_escalated'})
MERGE (r)-[:REFLECTS_ON]->(tp);

MATCH (r:Reflection {id: 'ref_escalated_left'}), (mr:MomentResponse {id: 'mr_left'})
MERGE (r)-[:FOR_RESPONSE]->(mr);

// tp_went_okay + mr_stayed_course
MERGE (r:Reflection {id: 'ref_okay_stayed'})
SET r.text = "You stayed on course — that means something worked. Let's be specific about what so you can replicate it. Was it something you said, something you didn't say, or something you did with your body?",
    r.isDefault = false;

MATCH (r:Reflection {id: 'ref_okay_stayed'}), (tp:TurningPoint {id: 'tp_went_okay'})
MERGE (r)-[:REFLECTS_ON]->(tp);

MATCH (r:Reflection {id: 'ref_okay_stayed'}), (mr:MomentResponse {id: 'mr_stayed_course'})
MERGE (r)-[:FOR_RESPONSE]->(mr);

// tp_something_else + any response — use the default
// Default reflection for uncovered combos
MERGE (r:Reflection {id: 'ref_default'})
SET r.text = "Whatever happened in that moment, your nervous system was doing its best with what it had. Let's build something you can reach for next time.",
    r.isDefault = true;

// ── CopeAhead nodes ──
// Keyed to MomentResponse via FOR_RESPONSE, plus universals.

MERGE (ca:CopeAhead {id: 'ca_pause_phrase'})
SET ca.label = 'Have a pause phrase ready',
    ca.rehearsal = "Before the conversation, choose one sentence you can say when you feel the moment arriving. Something like: 'I want to keep talking about this — I just need a second.' Practice saying it out loud three times, right now. Notice what it feels like in your mouth.",
    ca.isUniversal = true;

MERGE (ca:CopeAhead {id: 'ca_body_anchor'})
SET ca.label = 'Anchor in your body first',
    ca.rehearsal = "When you notice the signal — feet on floor, hands on thighs, one slow breath. You're not calming down. You're buying your thinking brain two seconds to come online. Try it now: feet, hands, breath.",
    ca.isUniversal = true;

MERGE (ca:CopeAhead {id: 'ca_broken_record'})
SET ca.label = 'Use the broken record technique',
    ca.rehearsal = "Pick your one key sentence — the thing you actually need to say. When the conversation starts spinning, come back to it. Same words, calm voice. 'What I need is ___.' Practice saying it three times now, each time a little softer.",
    ca.isUniversal = false;

MATCH (ca:CopeAhead {id: 'ca_broken_record'}), (mr:MomentResponse {id: 'mr_changed_subject'})
MERGE (ca)-[:FOR_RESPONSE]->(mr);

MATCH (ca:CopeAhead {id: 'ca_broken_record'}), (mr:MomentResponse {id: 'mr_went_quiet'})
MERGE (ca)-[:FOR_RESPONSE]->(mr);

MERGE (ca:CopeAhead {id: 'ca_name_the_dynamic'})
SET ca.label = 'Name what\'s happening',
    ca.rehearsal = "When things escalate, try naming the pattern instead of the content: 'I notice we're both getting louder. I don't want to do that. Can we slow down?' Practice saying this out loud. It's surprisingly disarming.",
    ca.isUniversal = false;

MATCH (ca:CopeAhead {id: 'ca_name_the_dynamic'}), (mr:MomentResponse {id: 'mr_got_loud'})
MERGE (ca)-[:FOR_RESPONSE]->(mr);

MATCH (ca:CopeAhead {id: 'ca_name_the_dynamic'}), (mr:MomentResponse {id: 'mr_left'})
MERGE (ca)-[:FOR_RESPONSE]->(mr);

MERGE (ca:CopeAhead {id: 'ca_planned_exit'})
SET ca.label = 'Plan your exit line in advance',
    ca.rehearsal = "Choose your exit sentence now: 'I care about this too much to keep going when we're both activated. Can we come back to this at [specific time]?' Say it out loud. The key is naming a return time — that's what makes it a pause, not an escape.",
    ca.isUniversal = false;

MATCH (ca:CopeAhead {id: 'ca_planned_exit'}), (mr:MomentResponse {id: 'mr_left'})
MERGE (ca)-[:FOR_RESPONSE]->(mr);

MATCH (ca:CopeAhead {id: 'ca_planned_exit'}), (mr:MomentResponse {id: 'mr_froze'})
MERGE (ca)-[:FOR_RESPONSE]->(mr);

MERGE (ca:CopeAhead {id: 'ca_validate_first'})
SET ca.label = 'Lead with validation',
    ca.rehearsal = "Before you say what you need, acknowledge what they're feeling first: 'I can see this is hard for you too.' One sentence of validation can lower their defenses enough for them to actually hear you. Practice saying it now.",
    ca.isUniversal = false;

MATCH (ca:CopeAhead {id: 'ca_validate_first'}), (mr:MomentResponse {id: 'mr_agreed'})
MERGE (ca)-[:FOR_RESPONSE]->(mr);

MATCH (ca:CopeAhead {id: 'ca_validate_first'}), (mr:MomentResponse {id: 'mr_froze'})
MERGE (ca)-[:FOR_RESPONSE]->(mr);

MERGE (ca:CopeAhead {id: 'ca_tears_plan'})
SET ca.label = 'Make a tears-are-okay plan',
    ca.rehearsal = "Give yourself permission in advance: 'If I cry, that's okay. I'm going to keep talking.' You might even tell them: 'I might get emotional. That doesn't mean I want to stop.' Practice saying that sentence. Notice what comes up.",
    ca.isUniversal = false;

MATCH (ca:CopeAhead {id: 'ca_tears_plan'}), (mr:MomentResponse {id: 'mr_cried'})
MERGE (ca)-[:FOR_RESPONSE]->(mr);

MERGE (ca:CopeAhead {id: 'ca_apology_check'})
SET ca.label = 'Add an apology checkpoint',
    ca.rehearsal = "When you feel the urge to apologize, pause and ask yourself: 'Did I actually do something wrong, or am I just uncomfortable?' If the answer is discomfort, try saying 'I understand this is hard' instead of 'I'm sorry.' Practice the swap now.",
    ca.isUniversal = false;

MATCH (ca:CopeAhead {id: 'ca_apology_check'}), (mr:MomentResponse {id: 'mr_agreed'})
MERGE (ca)-[:FOR_RESPONSE]->(mr);

MERGE (ca:CopeAhead {id: 'ca_write_it_down'})
SET ca.label = 'Write your key points down',
    ca.rehearsal = "Take out your phone or a piece of paper. Write down the 2-3 things you want to say. It's not a script — it's a lifeline. When your brain goes offline, you can glance down. Having it written means your thinking brain already did the work.",
    ca.isUniversal = false;

MATCH (ca:CopeAhead {id: 'ca_write_it_down'}), (mr:MomentResponse {id: 'mr_froze'})
MERGE (ca)-[:FOR_RESPONSE]->(mr);

MATCH (ca:CopeAhead {id: 'ca_write_it_down'}), (mr:MomentResponse {id: 'mr_went_quiet'})
MERGE (ca)-[:FOR_RESPONSE]->(mr);

MERGE (ca:CopeAhead {id: 'ca_time_limit'})
SET ca.label = 'Set a time limit for the conversation',
    ca.rehearsal = "Before you start, say: 'I want to talk about this for 15 minutes and then check in about how we're both doing.' A time limit makes hard conversations feel survivable. It also gives you a natural exit point that doesn't feel like running.",
    ca.isUniversal = false;

MATCH (ca:CopeAhead {id: 'ca_time_limit'}), (mr:MomentResponse {id: 'mr_got_loud'})
MERGE (ca)-[:FOR_RESPONSE]->(mr);

MATCH (ca:CopeAhead {id: 'ca_time_limit'}), (mr:MomentResponse {id: 'mr_cried'})
MERGE (ca)-[:FOR_RESPONSE]->(mr);

MERGE (ca:CopeAhead {id: 'ca_success_anchor'})
SET ca.label = 'Anchor to what worked this time',
    ca.rehearsal = "You stayed on course. Before you forget how that felt, describe it to yourself: what did you do with your body? Your voice? What did you focus on? Write it down. This is your playbook for next time.",
    ca.isUniversal = false;

MATCH (ca:CopeAhead {id: 'ca_success_anchor'}), (mr:MomentResponse {id: 'mr_stayed_course'})
MERGE (ca)-[:FOR_RESPONSE]->(mr);

// ── New DearManFeelingChip nodes for debrief ──

MERGE (f:DearManFeelingChip {id: 'drained'})
SET f.label = 'Drained',
    f.sortOrder = 19;

MERGE (f:DearManFeelingChip {id: 'numb'})
SET f.label = 'Numb',
    f.sortOrder = 20;

MERGE (f:DearManFeelingChip {id: 'shaky'})
SET f.label = 'Shaky',
    f.sortOrder = 21;

MERGE (f:DearManFeelingChip {id: 'wound_up'})
SET f.label = 'Wound up',
    f.sortOrder = 22;

MERGE (f:DearManFeelingChip {id: 'defeated'})
SET f.label = 'Defeated',
    f.sortOrder = 23;
