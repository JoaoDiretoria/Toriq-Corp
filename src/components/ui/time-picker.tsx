import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock } from "lucide-react";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function TimePicker({ value, onChange, className, placeholder = "00:00:00" }: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const hoursRef = React.useRef<HTMLDivElement>(null);
  const minutesRef = React.useRef<HTMLDivElement>(null);
  const secondsRef = React.useRef<HTMLDivElement>(null);
  
  // Parse current value
  const [hours, minutes, seconds] = React.useMemo(() => {
    const parts = (value || "00:00:00").split(":");
    return [
      parseInt(parts[0] || "0", 10),
      parseInt(parts[1] || "0", 10),
      parseInt(parts[2] || "0", 10)
    ];
  }, [value]);

  // Scroll to selected value when popover opens
  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        const scrollToSelected = (ref: React.RefObject<HTMLDivElement>, index: number) => {
          if (ref.current) {
            const buttonHeight = 32; // h-8 = 32px
            ref.current.scrollTop = Math.max(0, index * buttonHeight - 64);
          }
        };
        scrollToSelected(hoursRef, hours);
        scrollToSelected(minutesRef, minutes);
        scrollToSelected(secondsRef, seconds);
      }, 0);
    }
  }, [open, hours, minutes, seconds]);

  const handleSelect = (type: "hours" | "minutes" | "seconds", val: number) => {
    const newHours = type === "hours" ? val : hours;
    const newMinutes = type === "minutes" ? val : minutes;
    const newSeconds = type === "seconds" ? val : seconds;
    
    const formatted = `${String(newHours).padStart(2, "0")}:${String(newMinutes).padStart(2, "0")}:${String(newSeconds).padStart(2, "0")}`;
    onChange(formatted);
  };

  const hoursArray = Array.from({ length: 24 }, (_, i) => i);
  const minutesSecondsArray = Array.from({ length: 60 }, (_, i) => i);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span>{value || placeholder}</span>
          <Clock className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex divide-x">
          {/* Hours */}
          <div className="flex flex-col">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground text-center border-b bg-muted/50">
              Hora
            </div>
            <div 
              ref={hoursRef}
              className="h-[200px] w-16 overflow-y-auto p-1"
            >
              {hoursArray.map((h) => (
                <Button
                  key={h}
                  variant={hours === h ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "w-full justify-center font-mono text-sm h-8",
                    hours === h && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => handleSelect("hours", h)}
                >
                  {String(h).padStart(2, "0")}
                </Button>
              ))}
            </div>
          </div>

          {/* Minutes */}
          <div className="flex flex-col">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground text-center border-b bg-muted/50">
              Min
            </div>
            <div 
              ref={minutesRef}
              className="h-[200px] w-16 overflow-y-auto p-1"
            >
              {minutesSecondsArray.map((m) => (
                <Button
                  key={m}
                  variant={minutes === m ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "w-full justify-center font-mono text-sm h-8",
                    minutes === m && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => handleSelect("minutes", m)}
                >
                  {String(m).padStart(2, "0")}
                </Button>
              ))}
            </div>
          </div>

          {/* Seconds */}
          <div className="flex flex-col">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground text-center border-b bg-muted/50">
              Seg
            </div>
            <div 
              ref={secondsRef}
              className="h-[200px] w-16 overflow-y-auto p-1"
            >
              {minutesSecondsArray.map((s) => (
                <Button
                  key={s}
                  variant={seconds === s ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "w-full justify-center font-mono text-sm h-8",
                    seconds === s && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => handleSelect("seconds", s)}
                >
                  {String(s).padStart(2, "0")}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
