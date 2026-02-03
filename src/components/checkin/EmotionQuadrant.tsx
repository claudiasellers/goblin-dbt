interface EmotionQuadrantProps {
  onSelect: (quadrant: string) => void;
}

const quadrants = [
  {
    id: 'high-unpleasant',
    label: 'High Energy\nUnpleasant',
    gradient: 'bg-gradient-to-br from-[#F9A8C9] via-[#F786AA] to-[#E86A9A]',
    shimmer: 'before:bg-gradient-to-b before:from-white/40 before:to-transparent',
    examples: 'Angry, Anxious, Stressed',
  },
  {
    id: 'high-pleasant',
    label: 'High Energy\nPleasant',
    gradient: 'bg-gradient-to-br from-[#FCF0B5] via-[#F9E076] to-[#E8C84A]',
    shimmer: 'before:bg-gradient-to-b before:from-white/50 before:to-transparent',
    examples: 'Excited, Joyful, Energized',
  },
  {
    id: 'low-unpleasant',
    label: 'Low Energy\nUnpleasant',
    gradient: 'bg-gradient-to-br from-[#C5D8EB] via-[#A3C1DA] to-[#8BAFC9]',
    shimmer: 'before:bg-gradient-to-b before:from-white/40 before:to-transparent',
    examples: 'Sad, Tired, Lonely',
  },
  {
    id: 'low-pleasant',
    label: 'Low Energy\nPleasant',
    gradient: 'bg-gradient-to-br from-[#D0F0E8] via-[#B2E2D4] to-[#8DD4C0]',
    shimmer: 'before:bg-gradient-to-b before:from-white/50 before:to-transparent',
    examples: 'Calm, Relaxed, Peaceful',
  },
];

export function EmotionQuadrant({ onSelect }: EmotionQuadrantProps) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-[var(--color-text-primary)] text-center mb-3 tracking-normal">
        How do you feel right now?
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] text-center mb-6 leading-relaxed">
        Tap the color that best describes your current state
      </p>

      <div className="grid grid-cols-2 gap-4">
        {quadrants.map((quadrant) => (
          <button
            key={quadrant.id}
            onClick={() => onSelect(quadrant.id)}
            className={`
              ${quadrant.gradient}
              relative overflow-hidden
              aspect-square rounded-[28px] p-4
              flex flex-col items-center justify-center
              text-[var(--color-text-primary)]
              border border-[rgba(212,175,55,0.3)]
              shadow-[0_4px_20px_rgba(155,89,182,0.15),inset_0_2px_4px_rgba(255,255,255,0.6)]
              hover:shadow-[0_6px_28px_rgba(155,89,182,0.25),inset_0_2px_4px_rgba(255,255,255,0.8)]
              transform hover:scale-[1.02] active:scale-[0.98]
              transition-all duration-300
              before:absolute before:inset-0 before:rounded-[28px]
              ${quadrant.shimmer}
              before:pointer-events-none
            `}
          >
            <span className="font-semibold text-center whitespace-pre-line text-lg mb-2 drop-shadow-sm relative z-10">
              {quadrant.label}
            </span>
            <span className="text-xs opacity-70 text-center relative z-10">
              {quadrant.examples}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
