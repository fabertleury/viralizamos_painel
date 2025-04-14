import React from "react";
import { cn } from "../../utils/cn";
import { ChevronDown } from "lucide-react";

const Select = React.forwardRef<
  HTMLSelectElement,
  React.HTMLAttributes<HTMLSelectElement> & { value?: string; onValueChange?: (value: string) => void }
>(({ className, children, value, onValueChange, ...props }, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onValueChange) {
      onValueChange(e.target.value);
    }
  };

  return (
    <div className="relative">
      <select
        ref={ref}
        value={value}
        onChange={handleChange}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50" />
    </div>
  );
});
Select.displayName = "Select";

const SelectTrigger = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <ChevronDown className="h-4 w-4 opacity-50" />
  </div>
);
SelectTrigger.displayName = "SelectTrigger";

const SelectValue = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn("flex-grow text-sm truncate", className)} {...props} />
);
SelectValue.displayName = "SelectValue";

const SelectContent = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80",
      className
    )}
    {...props}
  >
    <div className="w-full p-1">{children}</div>
  </div>
);
SelectContent.displayName = "SelectContent";

const SelectItem = ({
  className,
  children,
  value,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: string }) => (
  <div
    data-value={value}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    {children}
  </div>
);
SelectItem.displayName = "SelectItem";

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }; 