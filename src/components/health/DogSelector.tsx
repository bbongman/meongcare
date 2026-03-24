import { Dog } from "@/hooks/use-dogs";
import { cn } from "@/lib/utils";

interface DogSelectorProps {
  dogs: Dog[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function DogSelector({ dogs, selectedId, onSelect }: DogSelectorProps) {
  if (!dogs.length) return null;
  const activeId = selectedId ?? dogs[0].id;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {dogs.map((dog) => (
        <button
          key={dog.id}
          onClick={() => onSelect(dog.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold shrink-0 transition-all",
            activeId === dog.id
              ? "bg-primary/10 border-primary/40 text-primary"
              : "bg-card border-border/50 text-foreground"
          )}
        >
          <span>🐶</span>
          {dog.name}
          {activeId === dog.id && (
            <span className="text-xs text-primary/60">{dog.breed}</span>
          )}
        </button>
      ))}
    </div>
  );
}
