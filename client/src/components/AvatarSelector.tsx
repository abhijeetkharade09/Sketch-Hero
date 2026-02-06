import { cn } from "@/lib/utils";

const AVATARS = [
  "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", 
  "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🦄"
];

interface AvatarSelectorProps {
  value: string;
  onChange: (avatar: string) => void;
}

export function AvatarSelector({ value, onChange }: AvatarSelectorProps) {
  return (
    <div className="space-y-2 xs:space-y-2.5 sm:space-y-3">
      <label className="text-xs xs:text-xs sm:text-sm font-bold text-white/80 uppercase tracking-wider pl-1">
        Choose Avatar
      </label>

      <div
        className="
          grid
          grid-cols-4
          xs:grid-cols-5
          sm:grid-cols-6
          md:grid-cols-8
          gap-1.5
          xs:gap-2
          sm:gap-2.5
          md:gap-3
          bg-white/10
          p-2.5
          xs:p-3
          sm:p-4
          rounded-lg
          sm:rounded-xl
          backdrop-blur-sm
          border-2
          border-white/20
        "
      >
        {AVATARS.map((avatar) => (
          <button
            key={avatar}
            type="button"
            onClick={() => onChange(avatar)}
            className={cn(
              `
              w-7 h-7
              xs:w-8 xs:h-8
              sm:w-9 sm:h-9
              md:w-10 md:h-10
              flex items-center justify-center
              text-base
              xs:text-lg
              sm:text-xl
              md:text-2xl
              rounded-full
              transition-all
              active:scale-95
              `,
              value === avatar
                ? "bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)] scale-110"
                : "bg-white/20 hover:bg-white/40 hover:scale-110"
            )}
          >
            {avatar}
          </button>
        ))}
      </div>
    </div>
  );
}
