import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "../../utils/cn";
import { Button } from "./button";
import { Input } from "./input";

interface DatePickerProps {
  date?: Date;
  setDate: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  date,
  setDate,
  placeholder = "Selecione a data",
  className,
  disabled = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleCalendarClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleDateSelect = (selectedDate: Date) => {
    setDate(selectedDate);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDate(undefined);
  };

  return (
    <div className="relative">
      <div
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onClick={handleCalendarClick}
      >
        <span className={!date ? "text-muted-foreground" : ""}>
          {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {date && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto p-0 px-1"
              onClick={handleClear}
              disabled={disabled}
            >
              ✕
            </Button>
          )}
          <CalendarIcon className="h-4 w-4 opacity-50" />
        </div>
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 p-3 bg-white rounded-md shadow-md border">
          <DatePickerCalendar
            selectedDate={date}
            onSelect={handleDateSelect}
          />
        </div>
      )}
    </div>
  );
}

interface DatePickerCalendarProps {
  selectedDate?: Date;
  onSelect: (date: Date) => void;
}

function DatePickerCalendar({
  selectedDate,
  onSelect,
}: DatePickerCalendarProps) {
  const [viewDate, setViewDate] = React.useState(selectedDate || new Date());
  const [currentMonth, setCurrentMonth] = React.useState(viewDate.getMonth());
  const [currentYear, setCurrentYear] = React.useState(
    viewDate.getFullYear()
  );

  React.useEffect(() => {
    setCurrentMonth(viewDate.getMonth());
    setCurrentYear(viewDate.getFullYear());
  }, [viewDate]);

  const previousMonth = () => {
    setViewDate(
      new Date(
        currentMonth === 0 ? currentYear - 1 : currentYear,
        currentMonth === 0 ? 11 : currentMonth - 1,
        1
      )
    );
  };

  const nextMonth = () => {
    setViewDate(
      new Date(
        currentMonth === 11 ? currentYear + 1 : currentYear,
        currentMonth === 11 ? 0 : currentMonth + 1,
        1
      )
    );
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const renderDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Adiciona dias vazios para completar a semana
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="w-8 h-8"></div>
      );
    }

    // Adiciona os dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isSelected = selectedDate && 
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear();
      
      days.push(
        <div
          key={day}
          onClick={() => onSelect(date)}
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded-full text-sm cursor-pointer hover:bg-gray-100",
            isSelected && "bg-primary text-primary-foreground hover:bg-primary"
          )}
        >
          {day}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={previousMonth}
        >
          &lt;
        </Button>
        <div className="text-sm font-medium">
          {format(new Date(currentYear, currentMonth), "MMMM yyyy", {
            locale: ptBR,
          })}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={nextMonth}
        >
          &gt;
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((day, i) => (
          <div
            key={i}
            className="w-8 h-8 flex items-center justify-center text-xs text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">{renderDays()}</div>
    </div>
  );
} 