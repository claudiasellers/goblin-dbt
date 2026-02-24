interface EmotionQuadrantProps {
  onSelect: (quadrant: string) => void;
}

const quadrants = [
  {
    id: 'high-unpleasant',
    label: 'High Energy\nUnpleasant',
    color: 'bg-gradient-to-br from-red-400 to-rose-500',
    textColor: 'text-white',
    examples: 'Angry, Anxious, Stressed',
  },
  {
    id: 'high-pleasant',
    label: 'High Energy\nPleasant',
    color: 'bg-gradient-to-br from-yellow-400 to-amber-500',
    textColor: 'text-black',
    examples: 'Excited, Joyful, Energized',
  },
  {
    id: 'low-unpleasant',
    label: 'Low Energy\nUnpleasant',
    color: 'bg-gradient-to-br from-blue-400 to-indigo-500',
    textColor: 'text-white',
    examples: 'Sad, Tired, Lonely',
  },
  {
    id: 'low-pleasant',
    label: 'Low Energy\nPleasant',
    color: 'bg-gradient-to-br from-emerald-400 to-teal-500',
    textColor: 'text-black',
    examples: 'Calm, Relaxed, Peaceful',
  },
];

export function EmotionQuadrant({ onSelect }: EmotionQuadrantProps) {
  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-sage-800)] text-center mb-2">
        How do you feel right now?
      </h2>
      <p className="text-sm text-[var(--color-sage-600)] text-center mb-6">
        Tap the color that best describes your current state
      </p>

      <div className="max-w-xs mx-auto">
        <div className="grid grid-cols-2 gap-3">
          {quadrants.map((quadrant) => (
            <button
              key={quadrant.id}
              onClick={() => onSelect(quadrant.id)}
              className={`
                ${quadrant.color} ${quadrant.textColor}
                aspect-square rounded-3xl p-3
                flex flex-col items-center justify-center
                shadow-lg hover:shadow-xl
                transform hover:scale-[1.02] active:scale-[0.98]
                transition-all duration-200
              `}
            >
              <span className="font-semibold text-center whitespace-pre-line text-base mb-1">
                {quadrant.label}
              </span>
              <span className="text-xs opacity-80 text-center leading-tight">
                {quadrant.examples}
              </span>
            </button>
          ))}
        </div>
        {/* Axis labels */}
        <div className="relative mt-3">
          <div className="flex justify-between text-xs text-[var(--color-sage-500)] px-1">
            <span>Unpleasant</span>
            <span>Pleasant</span>
          </div>
        </div>
      </div>
    </div>
  );
}
