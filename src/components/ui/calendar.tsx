import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-3",
        caption: "flex justify-center pt-1 relative items-center mb-3",
        caption_label: "text-sm font-medium text-white",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "absolute top-1 h-7 w-7 bg-transparent border-0 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        ),
        nav_button_previous: "left-1",
        nav_button_next: "right-1",
        table: "w-full",
        head_row: "grid grid-cols-7 gap-1 mb-1",
        head_cell:
          "text-center text-xs font-normal text-white/60 w-10 h-10 flex items-center justify-center",
        row: "grid grid-cols-7 gap-1",
        cell: "w-10 h-10 flex items-center justify-center relative",
        day: "w-10 h-10 rounded-full flex items-center justify-center text-sm font-normal text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0",
        day_range_end: "day-range-end",
        day_selected: "theme-calendar-selected",
        day_today: "theme-calendar-today",
        day_outside: "text-white/30",
        day_disabled: "text-white/20 opacity-50 cursor-not-allowed",
        day_range_middle: "theme-calendar-range-middle",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
