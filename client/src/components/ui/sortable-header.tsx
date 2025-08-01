import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SortableHeaderProps {
  children: React.ReactNode;
  sortKey: string;
  currentSort: string;
  currentOrder: 'asc' | 'desc';
  onSort: (key: string) => void;
  className?: string;
}

export function SortableHeader({ 
  children, 
  sortKey, 
  currentSort, 
  currentOrder, 
  onSort,
  className = ""
}: SortableHeaderProps) {
  const isActive = currentSort === sortKey;
  
  return (
    <th className={`text-left font-medium ${className}`}>
      <div
        className="flex items-center cursor-pointer hover:text-blue-600 transition-colors"
        onClick={() => onSort(sortKey)}
      >
        {children}
        <span className="ml-2">
          {isActive ? (
            currentOrder === 'asc' ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )
          ) : (
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          )}
        </span>
      </div>
    </th>
  );
}