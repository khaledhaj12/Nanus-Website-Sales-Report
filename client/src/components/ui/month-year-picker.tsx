import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface MonthYearPickerProps {
  value?: string; // Format: "YYYY-MM"
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function MonthYearPicker({ value, onChange, placeholder = "Select month", className }: MonthYearPickerProps) {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  // Initialize with current month/year if no value provided
  const [selectedYear, setSelectedYear] = useState(
    value ? parseInt(value.split('-')[0]) : currentYear
  );
  const [selectedMonth, setSelectedMonth] = useState(
    value ? parseInt(value.split('-')[1]) - 1 : currentMonth
  );
  const [isOpen, setIsOpen] = useState(false);

  // Update internal state when external value changes
  useEffect(() => {
    if (value) {
      const [year, month] = value.split('-');
      setSelectedYear(parseInt(year));
      setSelectedMonth(parseInt(month) - 1);
    }
  }, [value]);

  // Generate year options (current year ± 5 years)
  const yearOptions = [];
  for (let year = currentYear - 5; year <= currentYear + 5; year++) {
    yearOptions.push(year);
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleMonthYearSelect = () => {
    const formattedValue = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    onChange(formattedValue);
    setIsOpen(false);
  };

  const getDisplayValue = () => {
    if (value) {
      const [year, month] = value.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return format(date, "MMMM yyyy");
    }
    return format(new Date(currentYear, currentMonth), "MMMM yyyy");
  };

  const navigateYear = (direction: 'prev' | 'next') => {
    setSelectedYear(prev => direction === 'prev' ? prev - 1 : prev + 1);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`justify-start text-left font-normal ${className}`}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {getDisplayValue()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          {/* Year Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateYear('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-lg">{selectedYear}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateYear('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Month Grid */}
          <div className="grid grid-cols-3 gap-2">
            {monthNames.map((month, index) => (
              <Button
                key={month}
                variant={selectedMonth === index ? "default" : "outline"}
                size="sm"
                className="text-sm"
                onClick={() => setSelectedMonth(index)}
              >
                {month.slice(0, 3)}
              </Button>
            ))}
          </div>
          
          {/* Confirm Button */}
          <Button 
            onClick={handleMonthYearSelect}
            className="w-full"
          >
            Select {monthNames[selectedMonth]} {selectedYear}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}