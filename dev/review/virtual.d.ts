/** The review harness's build-time modules (dev/review/vitePlugin.ts). */
declare module 'virtual:review-pack' {
  /** The sign-off pack's surfaces (scripts/parts/review.mjs `surfaces`), in its order. */
  const surfaces: { id: string; title: string; where: string }[];
  export default surfaces;
}
declare module 'virtual:review-host-copy' {
  const host: {
    oa: { copy: { effectiveness: string }; choices: { goal: { id: string; label: string }[]; effectiveness: { id: string; label: string }[] } };
    ambivalence: { id: string; label: string; follow: string }[];
    /** ActionUrge id → label. */
    actionUrges: Record<string, string>;
  };
  export default host;
}
