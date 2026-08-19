import { Badge } from "@/components/ui/badge";
import { TONES } from "@/lib/store";

export function ToneSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (t: string) => {
    if (value.includes(t)) onChange(value.filter((x) => x !== t));
    else if (value.length < 3) onChange([...value, t]);
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {TONES.map((t) => (
        <button key={t} type="button" onClick={() => toggle(t)}>
          <Badge
            variant={value.includes(t) ? "default" : "outline"}
            className="cursor-pointer capitalize"
          >
            {t}
          </Badge>
        </button>
      ))}
      <span className="w-full text-xs text-muted-foreground">
        Choose up to 3 tones ({value.length}/3)
      </span>
    </div>
  );
}
