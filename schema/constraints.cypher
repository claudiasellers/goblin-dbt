// ============================================================
// CONSTRAINTS & INDEXES — the single home for schema DDL (plan R13)
//
// Loaded FIRST by scripts/load-graph.mjs (LOAD_ORDER[0]). Every label that
// any schema file MERGEs by `id` or `key` has a uniqueness constraint here
// (tests/schema-idempotency.test.mjs enforces it), so a MERGE can never
// create a second copy of a node.
//
// Rules for new work:
// - add the constraint here, in the section for its module, before the
//   file that MERGEs the label is loaded; generators emit no DDL;
// - always `IF NOT EXISTS`. Names match the constraints some older files
//   still declare inline (those statements are now no-ops): an equivalent
//   constraint under another name is also a no-op under IF NOT EXISTS;
// - the loader fails hard (exit 3) if a constraint can't be created:
//   that means duplicates exist; run schema/maintenance/dedupe-* first.
// ============================================================


// --- Base graph (knowledge-graph.cypher, relationships.cypher and the files that extend them) ---
CREATE CONSTRAINT emotion_id IF NOT EXISTS FOR (e:Emotion) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT brain_id IF NOT EXISTS FOR (bs:BrainStructure) REQUIRE bs.id IS UNIQUE;
CREATE CONSTRAINT therapy_concept_id IF NOT EXISTS FOR (tc:TherapyConcept) REQUIRE tc.id IS UNIQUE;
CREATE CONSTRAINT activation_pattern_id IF NOT EXISTS FOR (ap:ActivationPattern) REQUIRE ap.id IS UNIQUE;
CREATE CONSTRAINT therapy_modality_id IF NOT EXISTS FOR (tm:TherapyModality) REQUIRE tm.id IS UNIQUE;
CREATE CONSTRAINT clinical_id IF NOT EXISTS FOR (cc:ClinicalConstruct) REQUIRE cc.id IS UNIQUE;
CREATE CONSTRAINT function_id IF NOT EXISTS FOR (f:Function) REQUIRE f.id IS UNIQUE;
CREATE CONSTRAINT network_id IF NOT EXISTS FOR (fn:FunctionalNetwork) REQUIRE fn.id IS UNIQUE;
CREATE CONSTRAINT neurochemical_id IF NOT EXISTS FOR (ns:NeurochemicalSystem) REQUIRE ns.id IS UNIQUE;
CREATE CONSTRAINT body_region_id IF NOT EXISTS FOR (br:BodyRegion) REQUIRE br.id IS UNIQUE;
CREATE CONSTRAINT sensation_type_id IF NOT EXISTS FOR (st:SensationType) REQUIRE st.id IS UNIQUE;
CREATE CONSTRAINT safety_flag_id IF NOT EXISTS FOR (sf:SafetyFlag) REQUIRE sf.id IS UNIQUE;
CREATE CONSTRAINT hitop_construct_id IF NOT EXISTS FOR (htopc:HiTOPConstruct) REQUIRE htopc.id IS UNIQUE;
CREATE CONSTRAINT rdoc_domain_id IF NOT EXISTS FOR (rdcd:RDoCDomain) REQUIRE rdcd.id IS UNIQUE;
CREATE CONSTRAINT rdoc_construct_id IF NOT EXISTS FOR (rdcc:RDoCConstruct) REQUIRE rdcc.id IS UNIQUE;
CREATE CONSTRAINT state_modulator_id IF NOT EXISTS FOR (sm:StateModulator) REQUIRE sm.id IS UNIQUE;
CREATE CONSTRAINT neural_signature_id IF NOT EXISTS FOR (ns:NeuralSignature) REQUIRE ns.id IS UNIQUE;
CREATE CONSTRAINT clinical_source_id IF NOT EXISTS FOR (cs:ClinicalSource) REQUIRE cs.id IS UNIQUE;
CREATE INDEX emotion_quadrant IF NOT EXISTS FOR (e:Emotion) ON (e.quadrant);
CREATE INDEX therapy_concept_modality IF NOT EXISTS FOR (tc:TherapyConcept) ON (tc.modality);

// --- Check-in content (discriminating-questions.cypher, somatic-narratives.cypher) ---
CREATE CONSTRAINT discriminating_question_id IF NOT EXISTS FOR (dq:DiscriminatingQuestion) REQUIRE dq.id IS UNIQUE;
CREATE CONSTRAINT question_response_id IF NOT EXISTS FOR (qr:QuestionResponse) REQUIRE qr.id IS UNIQUE;
CREATE CONSTRAINT somatic_quadrant_narrative_id IF NOT EXISTS FOR (sqn:SomaticQuadrantNarrative) REQUIRE sqn.id IS UNIQUE;

// --- Emotion regulation, Opposite Action, Problem Solve ---
CREATE CONSTRAINT emotion_regulation_content_parent IF NOT EXISTS FOR (erc:EmotionRegulationContent) REQUIRE erc.dbtParent IS UNIQUE;
CREATE CONSTRAINT action_urge_id IF NOT EXISTS FOR (au:ActionUrge) REQUIRE au.id IS UNIQUE;
CREATE CONSTRAINT oa_flow_id IF NOT EXISTS FOR (oaf:OppositeActionFlow) REQUIRE oaf.id IS UNIQUE;
CREATE CONSTRAINT ps_protocol_id IF NOT EXISTS FOR (psp:ProblemSolveProtocol) REQUIRE psp.id IS UNIQUE;
CREATE CONSTRAINT problem_type_id IF NOT EXISTS FOR (pt:ProblemType) REQUIRE pt.id IS UNIQUE;
CREATE CONSTRAINT solution_direction_id IF NOT EXISTS FOR (sd:SolutionDirection) REQUIRE sd.id IS UNIQUE;
CREATE CONSTRAINT barrier_type_id IF NOT EXISTS FOR (bt:BarrierType) REQUIRE bt.id IS UNIQUE;
CREATE CONSTRAINT barrier_sub_response_id IF NOT EXISTS FOR (bsr:BarrierSubResponse) REQUIRE bsr.id IS UNIQUE;
CREATE CONSTRAINT decomposition_aspect_id IF NOT EXISTS FOR (da:DecompositionAspect) REQUIRE da.id IS UNIQUE;
CREATE CONSTRAINT ambivalence_option_id IF NOT EXISTS FOR (ao:AmbivalenceOption) REQUIRE ao.id IS UNIQUE;

// --- DEAR MAN (dear-man-content*.cypher, dear-man-debrief-content.cypher, dear-man-safety-gates.cypher) ---
CREATE CONSTRAINT dearman_situation_type_id IF NOT EXISTS FOR (dmst:DearManSituationType) REQUIRE dmst.id IS UNIQUE;
CREATE CONSTRAINT dearman_describe_option_id IF NOT EXISTS FOR (dmdo:DearManDescribeOption) REQUIRE dmdo.id IS UNIQUE;
CREATE CONSTRAINT dearman_assert_option_id IF NOT EXISTS FOR (dmao:DearManAssertOption) REQUIRE dmao.id IS UNIQUE;
CREATE CONSTRAINT dearman_reinforce_option_id IF NOT EXISTS FOR (dmro:DearManReinforceOption) REQUIRE dmro.id IS UNIQUE;
CREATE CONSTRAINT dearman_barrier_id IF NOT EXISTS FOR (dmb:DearManBarrier) REQUIRE dmb.id IS UNIQUE;
CREATE CONSTRAINT dearman_barrier_coaching_id IF NOT EXISTS FOR (dmbc:DearManBarrierCoaching) REQUIRE dmbc.id IS UNIQUE;
CREATE CONSTRAINT dearman_anchor_phrase_id IF NOT EXISTS FOR (dmap:DearManAnchorPhrase) REQUIRE dmap.id IS UNIQUE;
CREATE CONSTRAINT dearman_negotiate_option_id IF NOT EXISTS FOR (dmno:DearManNegotiateOption) REQUIRE dmno.id IS UNIQUE;
CREATE CONSTRAINT dearman_debrief_option_id IF NOT EXISTS FOR (dmdo:DearManDebriefOption) REQUIRE dmdo.id IS UNIQUE;
CREATE CONSTRAINT dearman_step_insight_id IF NOT EXISTS FOR (dmsi:DearManStepInsight) REQUIRE dmsi.id IS UNIQUE;
CREATE CONSTRAINT dearman_feeling_chip_id IF NOT EXISTS FOR (dmfc:DearManFeelingChip) REQUIRE dmfc.id IS UNIQUE;
CREATE CONSTRAINT dearman_feeling_group_id IF NOT EXISTS FOR (dmfg:DearManFeelingGroup) REQUIRE dmfg.id IS UNIQUE;
CREATE CONSTRAINT dearman_anchor_need_id IF NOT EXISTS FOR (dman:DearManAnchorNeed) REQUIRE dman.id IS UNIQUE;
CREATE CONSTRAINT dearman_safety_copy_id IF NOT EXISTS FOR (dmsc:DearManSafetyCopy) REQUIRE dmsc.id IS UNIQUE;
CREATE CONSTRAINT turning_point_id IF NOT EXISTS FOR (tp:TurningPoint) REQUIRE tp.id IS UNIQUE;
CREATE CONSTRAINT moment_response_id IF NOT EXISTS FOR (mr:MomentResponse) REQUIRE mr.id IS UNIQUE;
CREATE CONSTRAINT body_signal_id IF NOT EXISTS FOR (bs:BodySignal) REQUIRE bs.id IS UNIQUE;
CREATE CONSTRAINT thought_pattern_id IF NOT EXISTS FOR (tp:ThoughtPattern) REQUIRE tp.id IS UNIQUE;
CREATE CONSTRAINT underneath_id IF NOT EXISTS FOR (u:Underneath) REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT reflection_id IF NOT EXISTS FOR (r:Reflection) REQUIRE r.id IS UNIQUE;
CREATE CONSTRAINT cope_ahead_id IF NOT EXISTS FOR (ca:CopeAhead) REQUIRE ca.id IS UNIQUE;

// --- Recover from a hurtful moment (invalidation-recovery.cypher) ---
CREATE CONSTRAINT recovery_flow_id IF NOT EXISTS FOR (irf:InvalidationRecoveryFlow) REQUIRE irf.id IS UNIQUE;
CREATE CONSTRAINT invalidation_event_id IF NOT EXISTS FOR (ie:InvalidationEvent) REQUIRE ie.id IS UNIQUE;
CREATE CONSTRAINT recovery_protocol_id IF NOT EXISTS FOR (rp:RecoveryProtocol) REQUIRE rp.id IS UNIQUE;
CREATE CONSTRAINT unmet_need_id IF NOT EXISTS FOR (un:UnmetNeed) REQUIRE un.id IS UNIQUE;
CREATE CONSTRAINT social_need_id IF NOT EXISTS FOR (sn:SocialNeed) REQUIRE sn.id IS UNIQUE;
CREATE CONSTRAINT recovery_exit_id IF NOT EXISTS FOR (re:RecoveryExit) REQUIRE re.id IS UNIQUE;
CREATE CONSTRAINT practice_skill_id IF NOT EXISTS FOR (ps:PracticeSkill) REQUIRE ps.id IS UNIQUE;

// --- Find the feeling (find-the-feeling.cypher) ---
CREATE CONSTRAINT find_flow_id IF NOT EXISTS FOR (ftff:FindTheFeelingFlow) REQUIRE ftff.id IS UNIQUE;
CREATE CONSTRAINT feeling_signature_id IF NOT EXISTS FOR (fs:FeelingSignature) REQUIRE fs.id IS UNIQUE;
CREATE CONSTRAINT feeling_family_id IF NOT EXISTS FOR (ff:FeelingFamily) REQUIRE ff.id IS UNIQUE;
CREATE CONSTRAINT feeling_urge_id IF NOT EXISTS FOR (fu:FeelingUrge) REQUIRE fu.id IS UNIQUE;

// --- Practice spine content (PR-S2, schema/practice-spine.cypher) ---
CREATE CONSTRAINT follow_up_type_id IF NOT EXISTS FOR (n:FollowUpType) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT session_close_flow_id IF NOT EXISTS FOR (n:SessionCloseFlow) REQUIRE n.id IS UNIQUE;

// --- Profile layer content (PR-P1, schema/profile-layer.cypher) ---
CREATE CONSTRAINT profile_area_id IF NOT EXISTS FOR (n:ProfileArea) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT profile_kind_id IF NOT EXISTS FOR (n:ProfileKind) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT pattern_rule_id IF NOT EXISTS FOR (n:PatternRule) REQUIRE n.id IS UNIQUE;

// --- Capacity band content (A4-1, schema/capacity.cypher) ---
CREATE CONSTRAINT capacity_probe_id IF NOT EXISTS FOR (n:CapacityProbe) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT handoff_primitive_id IF NOT EXISTS FOR (n:HandoffPrimitive) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT band_rule_id IF NOT EXISTS FOR (n:BandRule) REQUIRE n.id IS UNIQUE;

// --- Witness corpus (A5-1, schema/witness.cypher) ---
CREATE CONSTRAINT validation_line_id IF NOT EXISTS FOR (n:ValidationLine) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT tool_moment_id IF NOT EXISTS FOR (n:ToolMoment) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT voice_rule_id IF NOT EXISTS FOR (n:VoiceRule) REQUIRE n.id IS UNIQUE;
CREATE INDEX validation_line_status IF NOT EXISTS FOR (n:ValidationLine) ON (n.status);

// --- Check-in routing (recommended-for.cypher, plan E4-2). RECOMMENDED_FOR edges MERGE on their
// own `id` (relationship key constraints are Enterprise-only; the MATCHed endpoints are indexed). ---
CREATE CONSTRAINT routing_policy_id IF NOT EXISTS FOR (rp:RoutingPolicy) REQUIRE rp.id IS UNIQUE;

// --- User data (written by Cloud Functions, never by schema files) ---
// PR-S1 conventions (functions/src/userdata/layers.ts): every :UserData label has a unique `key`
// (= ownerId + ':' + id; writes MERGE on key), and every :UserData node is indexed on ownerId.
CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT checkin_id IF NOT EXISTS FOR (ci:CheckIn) REQUIRE ci.id IS UNIQUE;
CREATE INDEX checkin_timestamp IF NOT EXISTS FOR (ci:CheckIn) ON (ci.timestamp);
CREATE CONSTRAINT dearman_session_id IF NOT EXISTS FOR (dms:DearManSession) REQUIRE dms.id IS UNIQUE;
CREATE CONSTRAINT opposite_action_session_key IF NOT EXISTS FOR (oas:OppositeActionSession) REQUIRE oas.key IS UNIQUE;
CREATE INDEX opposite_action_session_due IF NOT EXISTS FOR (oas:OppositeActionSession) ON (oas.dueAt);
CREATE CONSTRAINT invalidation_recovery_session_key IF NOT EXISTS FOR (irs:InvalidationRecoverySession) REQUIRE irs.key IS UNIQUE;
CREATE INDEX invalidation_recovery_session_created IF NOT EXISTS FOR (irs:InvalidationRecoverySession) ON (irs.createdAt);
CREATE CONSTRAINT find_the_feeling_session_key IF NOT EXISTS FOR (ftfs:FindTheFeelingSession) REQUIRE ftfs.key IS UNIQUE;
CREATE INDEX find_the_feeling_session_created IF NOT EXISTS FOR (ftfs:FindTheFeelingSession) ON (ftfs.createdAt);
CREATE CONSTRAINT checkin_key IF NOT EXISTS FOR (n:CheckIn) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT body_sensation_key IF NOT EXISTS FOR (n:BodySensation) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT tool_usage_key IF NOT EXISTS FOR (n:ToolUsage) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT dearman_session_key IF NOT EXISTS FOR (n:DearManSession) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT tool_session_key IF NOT EXISTS FOR (n:ToolSession) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT skill_practice_key IF NOT EXISTS FOR (n:SkillPractice) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT follow_up_key IF NOT EXISTS FOR (n:FollowUp) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT pattern_offer_key IF NOT EXISTS FOR (n:PatternOffer) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT profile_fact_key IF NOT EXISTS FOR (n:ProfileFact) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT my_pattern_key IF NOT EXISTS FOR (n:MyPattern) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT own_line_key IF NOT EXISTS FOR (n:OwnLine) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT push_token_key IF NOT EXISTS FOR (n:PushToken) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT part_session_key IF NOT EXISTS FOR (n:PartSession) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT part_candidate_key IF NOT EXISTS FOR (n:PartCandidate) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT part_tag_key IF NOT EXISTS FOR (n:PartTag) REQUIRE n.key IS UNIQUE;
// One tag per tagged record (tagPart): the tagged ToolSession's key, unique across tags.
CREATE CONSTRAINT part_tag_tagged_key IF NOT EXISTS FOR (n:PartTag) REQUIRE n.taggedKey IS UNIQUE;
CREATE CONSTRAINT part_key IF NOT EXISTS FOR (n:Part) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT part_revisit_key IF NOT EXISTS FOR (n:PartRevisit) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT trail_offer_key IF NOT EXISTS FOR (n:TrailOffer) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT part_link_key IF NOT EXISTS FOR (n:PartLink) REQUIRE n.key IS UNIQUE;
CREATE CONSTRAINT den_snapshot_key IF NOT EXISTS FOR (n:DenSnapshot) REQUIRE n.key IS UNIQUE;
CREATE INDEX user_data_owner IF NOT EXISTS FOR (n:UserData) ON (n.ownerId);
CREATE INDEX tool_session_owner_started IF NOT EXISTS FOR (n:ToolSession) ON (n.ownerId, n.startedAt);
CREATE INDEX follow_up_status_due IF NOT EXISTS FOR (n:FollowUp) ON (n.status, n.dueAt);

// --- Body map (docs/design/body-map.md, schema/body-map.cypher) ---
CREATE CONSTRAINT body_map_content_id IF NOT EXISTS FOR (n:BodyMapContent) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT body_map_id IF NOT EXISTS FOR (n:BodyMap) REQUIRE n.id IS UNIQUE;

// --- Parts (docs/design/parts.md, schema/parts.cypher) ---
CREATE CONSTRAINT protective_move_id IF NOT EXISTS FOR (n:ProtectiveMove) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT pull_option_id IF NOT EXISTS FOR (n:PullOption) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT protected_hurt_id IF NOT EXISTS FOR (n:ProtectedHurt) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT part_prompt_id IF NOT EXISTS FOR (n:PartPrompt) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT part_option_id IF NOT EXISTS FOR (n:PartOption) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT polarity_pair_id IF NOT EXISTS FOR (n:PolarityPair) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT trail_rule_id IF NOT EXISTS FOR (n:TrailRule) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT trail_context_id IF NOT EXISTS FOR (n:TrailContext) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT parts_policy_id IF NOT EXISTS FOR (n:PartsPolicy) REQUIRE n.id IS UNIQUE;
