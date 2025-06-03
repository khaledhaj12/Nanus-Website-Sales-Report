import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  startValue?: string;
  endValue?: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function DateRangePicker({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  placeholder = "Select date range",
  className
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [startMonth, setStartMonth] = useState(new Date().getMonth());
  const [endYear, setEndYear] = useState(new Date().getFullYear());
  const [endMonth, setEndMonth] = useState(new Date().getMonth());
  const [selectingStart, setSelectingStart] = useState(true);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const formatDisplayValue = () => {
    if (!startValue && !endValue) return placeholder;
    
    const formatDate = (value: string) => {
      const date = new Date(value);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    };

    if (startValue && endValue) {
      return `${formatDate(startValue)} - ${formatDate(endValue)}`;
    } else if (startValue) {
      return `From ${formatDate(startValue)}`;
    } else if (endValue) {
      return `To ${formatDate(endValue)}`;
    }
    
    return placeholder;
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDateSelect = (year: number, month: number, day: number) => {
    const dateValue = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    if (selectingStart) {
      onStartChange(dateValue);
      // If no end date is set, set the same date as end date (for single day selection)
      if (!endValue) {
        onEndChange(dateValue);
      }
      setSelectingStart(false);
    } else {
      // Ensure end date is not before start date
      if (startValue && dateValue < startValue) {
        onStartChange(dateValue);
        onEndChange(startValue);
      } else {
        onEndChange(dateValue);
      }
      setSelectingStart(true);
      setIsOpen(false);
    }
  };

  const isDateSelected = (year: number, month: number, day: number, isStart: boolean) => {
    const dateValue = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    // Show selected dates on both calendars
    return startValue === dateValue || endValue === dateValue;
  };

  const isDateInRange = (year: number, month: number, day: number) => {
    if (!startValue || !endValue) return false;
    
    const dateValue = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return dateValue >= startValue && dateValue <= endValue;
  };

  const navigateMonth = (isStart: boolean, direction: 'prev' | 'next') => {
    if (isStart) {
      if (direction === 'prev') {
        if (startMonth === 0) {
          setStartMonth(11);
          setStartYear(startYear - 1);
        } else {
          setStartMonth(startMonth - 1);
        }
      } else {
        if (startMonth === 11) {
          setStartMonth(0);
          setStartYear(startYear + 1);
        } else {
          setStartMonth(startMonth + 1);
        }
      }
    } else {
      if (direction === 'prev') {
        if (endMonth === 0) {
          setEndMonth(11);
          setEndYear(endYear - 1);
        } else {
          setEndMonth(endMonth - 1);
        }
      } else {
        if (endMonth === 11) {
          setEndMonth(0);
          setEndYear(endYear + 1);
        } else {
          setEndMonth(endMonth + 1);
        }
      }
    }
  };

  const renderCalendarGrid = (year: number, month: number, isStart: boolean) => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
    }

    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = isDateSelected(year, month, day, isStart);
      const isInRange = isDateInRange(year, month, day);
      
      days.push(
        <Button
          key={day}
          variant={isSelected ? "default" : "ghost"}
          size="sm"
          className={cn(
            "h-8 w-8 p-0 text-xs",
            isInRange && !isSelected && "bg-blue-50 hover:bg-blue-100",
            isSelected && startValue === `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}` && "bg-green-600 hover:bg-green-700 text-white",
            isSelected && endValue === `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}` && startValue !== endValue && "bg-red-600 hover:bg-red-700 text-white",
            isSelected && startValue === endValue && startValue === `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}` && "bg-blue-600 hover:bg-blue-700 text-white"
          )}
          onClick={() => handleDateSelect(year, month, day)}
        >
          {day}
        </Button>
      );
    }

    return (
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth(isStart, 'prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium text-sm">
            {months[month]} {year}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth(isStart, 'next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className="h-8 w-8 flex items-center justify-center text-xs font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>
    );
  };

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
              Start Date {selectingStart && "(Selecting)"}
            </div>
            {renderCalendarGrid(startYear, startMonth, true)}
          </div>
          <div>
            <div className="p-3 text-sm font-medium text-center bg-red-50 border-b">
              End Date {!selectingStart && "(Selecting)"}
            </div>
            {renderCalendarGrid(endYear, endMonth, false)}
          </div>
        </div>
        <div className="p-3 border-t flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date();
              const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
              onStartChange(todayStr);
              onEndChange(todayStr);
              setSelectingStart(true);
              setIsOpen(false);
            }}
          >
            Today
          </Button>
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