/**
 * Parts on: the pull beside the person's goal on the effectiveness card (src/lib/oaGoalLine.ts), two quiet
 * lines above the question. A polite status line: it arrives after the card (once parts content loads), so a
 * screen reader hears it; the card's question also reads it through `aria-describedby` (`id`).
 */
export function GoalLine({ id, lines }: { id?: string; lines: readonly [string, string] }) {
  return (
    <div id={id} role="status" className="space-y-1" data-testid="goal-line">
      <p>{lines[0]}</p>
      <p>{lines[1]}</p>
    </div>
  );
}
