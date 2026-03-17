// ============================================
// Somatic Insight Narratives
// Adds somatic_narrative properties to ActivationPattern nodes
// and creates SomaticQuadrantNarrative nodes for quadrant fallbacks.
// These narratives power the Body Signal insight card.
// Safe to re-run (MERGE + SET).
// ============================================

// ── ActivationPattern somatic narratives ──

MATCH (p:ActivationPattern {id: 'acute_alarm'})
SET p.somatic_narrative = "Your amygdala sends alarm signals to your body in under 100 milliseconds — long before your cortex decides whether the threat is real. That's why these sensations arrive first. The next time you feel this region activate, you have roughly a 3–5 second window before the full stress response locks in. One slow exhale in that window activates the vagus nerve and changes what happens next. Not five breaths — one is enough to shift the trajectory.";

MATCH (p:ActivationPattern {id: 'chronic_vigilance'})
SET p.somatic_narrative = "This isn't a spike — it's a hold. Your BNST is maintaining a sustained threat signal, and these regions are bracing in response. Unlike acute alarm, this tension doesn't resolve on its own when the situation passes, because the BNST responds to anticipated threat, not a specific one. If you notice this tension and can't name what you're bracing for, that's the tell. Try this: press your feet into the floor and name five things you can physically see right now. You're giving your attention a concrete anchor — the scanning loop breaks when your senses have something specific to report.";

MATCH (p:ActivationPattern {id: 'emotional_flooding'})
SET p.somatic_narrative = "When your salience network overwhelms prefrontal regulation, your body becomes the main channel — shaking, pressure, heat, or paradoxically going blank. Cognitive tools won't land here because the prefrontal cortex is genuinely offline. Don't try to think your way through this. Cold water on your face or wrists, one slow exhale with a long out-breath, hands under running water — anything that talks to the vagus nerve directly. The thinking comes back on its own once the activation drops.";

MATCH (p:ActivationPattern {id: 'conservation_freeze'})
SET p.somatic_narrative = "Quiet doesn't mean nothing is happening. Your PAG is coordinating a global dampening response — motor output drops, sensory signals get muted, everything goes flat. These regions going silent is the signature. You won't be able to push through this with willpower, because the shutdown is happening below conscious control. Start with the smallest possible movement — wiggle your toes, press your feet into the floor, roll your shoulders once. You're not trying to feel better yet. You're re-engaging the motor system at the lowest level, and momentum builds from there.";

MATCH (p:ActivationPattern {id: 'dissociation_overmodulation'})
SET p.somatic_narrative = "Your prefrontal cortex is actively suppressing signals from your insula — the brain region that reads your body's internal state. That's why you feel disconnected: the sensory information is there, but the relay is turned down. You don't need intense sensation to come back — intensity can actually deepen the disconnect. Try this instead: hold something with a distinct texture or temperature. Run your thumb along a seam in your clothing. Touch a cold surface. You're giving the insula a clean, simple signal to pass along — not forcing the door open, just sliding information under it.";

MATCH (p:ActivationPattern {id: 'rumination_loop'})
SET p.somatic_narrative = "Your default mode network has captured almost all available attention, which means these body signals are still broadcasting but nobody's listening. That's actually what makes them powerful — the DMN can monopolize thought, but it can't monopolize sensation. When you notice the loop, move your attention to whichever of these regions you can feel right now. Press your hand there if it helps. You're not trying to stop the thoughts — you're giving your attention somewhere real to land. Hold the physical sensation for 30 seconds and notice what happens to the loop. It weakens when it loses its audience.";

MATCH (p:ActivationPattern {id: 'social_threat_shame'})
SET p.somatic_narrative = "Shame produces the most recognizable body response of any emotion — facial and chest flushing from vasodilation, postural contraction, the urge to hide. That's your behavioral inhibition system, and it activates whether or not the social threat is real. The specificity is useful: you don't need to figure out if it's shame — when these regions fire this way, it is. The move is to do the physical opposite of what the urge demands: stand or sit upright, take up space, orient your gaze outward instead of down. The posture change sends a counter-signal through the same circuits. You don't have to believe it — the body reads the position regardless.";

MATCH (p:ActivationPattern {id: 'reward_drive_low'})
SET p.somatic_narrative = "Heaviness, flatness, the absence of pull — that's your dopaminergic system running below threshold. It's not that you don't want to do things in some moral sense; the neurochemical signal that converts intention into action is genuinely low. 'Just do it' won't work because the system that fuels 'just doing it' is what's offline. Make the first step absurdly small — not 'go for a run' but 'put your shoes on.' Not 'clean the kitchen' but 'move one dish.' Dopamine responds to completion, even tiny completions. Get the first one and the next step gets easier.";

MATCH (p:ActivationPattern {id: 'reactive_aggression'})
SET p.somatic_narrative = "Heat, jaw tension, energy in the arms — your hypothalamus is activating motor preparation circuits while your amygdala suppresses the vulnerability underneath. Your body is converting a feeling it can't tolerate into one it can act on. The physical energy is real and needs somewhere to go — not into a conversation, not yet. Push your palms hard against a wall for ten seconds, squeeze an ice cube, take a hard fast walk. Once the sympathetic charge drops, the prefrontal cortex comes back online and the thing underneath the anger — usually hurt, fear, or helplessness — becomes accessible. That's when the real work starts.";

MATCH (p:ActivationPattern {id: 'grief_yearning'})
SET p.somatic_narrative = "The aching and hollowness in these regions isn't metaphorical — your nucleus accumbens is generating a seeking signal for a person who isn't there, the same circuit involved in any deep attachment. Your body is doing exactly what it's designed to do when a bond is disrupted. These sensations don't need to be fixed. Place a hand where you feel the ache most and breathe into the space around it — not to make it stop, but to give it room. Trying to push it away fights your attachment system, which makes the ache louder. Letting it be present without resisting is what allows it to move through at its own pace.";

// ── SomaticQuadrantNarrative nodes (quadrant fallbacks) ──

MERGE (n:SomaticQuadrantNarrative {id: 'high-unpleasant'})
SET n.narrative = "Your body registers stress before your prefrontal cortex has time to appraise the situation — the amygdala is faster. That means these sensations are showing up seconds to minutes before you'd consciously say 'I'm stressed.' Next time you notice them, don't wait for the thought to confirm it. One long exhale — longer out than in — activates the vagus nerve and buys your prefrontal cortex time to come online.";

MERGE (n:SomaticQuadrantNarrative {id: 'high-pleasant'})
SET n.narrative = "Positive arousal has a body signature too — most people just never learn theirs because they only pay attention to what hurts. Knowing what dopamine and ventral vagal activation actually feel like in your body gives you a concrete anchor. When things get hard, pause and ask: where in my body would I feel it if things were okay? You're not imagining calm — you're looking for a physical address you've been to before.";

MERGE (n:SomaticQuadrantNarrative {id: 'low-unpleasant'})
SET n.narrative = "Low-arousal difficult states don't set off alarms — they're more like a slow leak. Cortisol is still elevated, but without the dramatic sympathetic surge that forces you to pay attention. These sensations are what chronic stress feels like when it's not shouting. When you notice them, that's your cue to do something small before they become background noise — five minutes outside, one stretch, a texture change. The intervention is small because the signal is small.";

MERGE (n:SomaticQuadrantNarrative {id: 'low-pleasant'})
SET n.narrative = "This is what your nervous system feels like when it's in ventral vagal mode — regulated, safe, present. Most people can't describe what calm actually feels like in their body because no one ever asked them to notice. When you feel it here, take ten seconds to deliberately memorize the sensation. That's not soft advice — it's building a somatic reference point your body can find again under stress.";
