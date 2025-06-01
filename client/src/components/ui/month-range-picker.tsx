import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MonthRangePickerProps {
  startValue?: string;
  endValue?: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function MonthRangePicker({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  placeholder = "Select date range",
  className
}: MonthRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [endYear, setEndYear] = useState(new Date().getFullYear());
  const [selectingStart, setSelectingStart] = useState(true);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const formatDisplayValue = () => {
    if (!startValue && !endValue) return placeholder;
    
    const formatMonth = (value: string) => {
      const [year, month] = value.split('-');
      const monthName = months[parseInt(month) - 1];
      return `${monthName} ${year}`;
    };

    if (startValue && endValue) {
      return `${formatMonth(startValue)} - ${formatMonth(endValue)}`;
    } else if (startValue) {
      return `From ${formatMonth(startValue)}`;
    } else if (endValue) {
      return `To ${formatMonth(endValue)}`;
    }
    
    return placeholder;
  };

  const handleMonthSelect = (year: number, monthIndex: number) => {
    const monthValue = `${year}-${(monthIndex + 1).toString().padStart(2, '0')}`;
    
    if (selectingStart) {
      onStartChange(monthValue);
      setSelectingStart(false);
    } else {
      onEndChange(monthValue);
      setSelectingStart(true);
      setIsOpen(false);
    }
  };

  const isMonthSelected = (year: number, monthIndex: number, isStart: boolean) => {
    const monthValue = `${year}-${(monthIndex + 1).toString().padStart(2, '0')}`;
    return isStart ? startValue === monthValue : endValue === monthValue;
  };

  const isMonthInRange = (year: number, monthIndex: number) => {
    if (!startValue || !endValue) return false;
    
    const monthValue = `${year}-${(monthIndex + 1).toString().padStart(2, '0')}`;
    return monthValue >= startValue && monthValue <= endValue;
  };

  const renderMonthGrid = (year: number, isStart: boolean) => (
    <div className="grid grid-cols-3 gap-2 p-3">
      <div className="col-span-3 flex items-center justify-between mb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => isStart ? setStartYear(year - 1) : setEndYear(year - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium">{year}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => isStart ? setStartYear(year + 1) : setEndYear(year + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      {months.map((month, index) => {
        const isSelected = isMonthSelected(year, index, isStart);
        const isInRange = isMonthInRange(year, index);
        
        return (
          <Button
            key={month}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 text-xs",
              isInRange && !isSelected && "bg-blue-50 hover:bg-blue-100",
              isSelected && isStart && "bg-green-600 hover:bg-green-700",
              isSelected && !isStart && "bg-red-600 hover:bg-red-700"
            )}
            onClick={() => handleMonthSelect(year, index)}
          >
            {month.slice(0, 3)}
          </Button>
        );
      })}
    </div>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !startValue && !endValue && "text-muted-foreground",
            className
          )}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {formatDisplayValue()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="border-r">
            <div className="p-3 text-sm font-medium text-center bg-green-50 border-b">
              Start Month {selectingStart && "(Selecting)"}
            </div>
            {renderMonthGrid(startYear, true)}
          </div>
          <div>
            <div className="p-3 text-sm font-medium text-center bg-red-50 border-b">
              End Month {!selectingStart && "(Selecting)"}
            </div>
            {renderMonthGrid(endYear, false)}
          </div>
        </div>
        <div className="p-3 border-t flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onStartChange("");
              onEndChange("");
              setSelectingStart(true);
            }}
          >
            Clear
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            Close
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}