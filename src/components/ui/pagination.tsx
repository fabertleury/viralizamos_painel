import React from "react";
import { cn } from "../../utils/cn";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";

interface PaginationProps {
  totalPages: number;
  currentPage: number;
  onChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  totalPages,
  currentPage,
  onChange,
  className,
}: PaginationProps) {
  const renderPageButtons = () => {
    const buttons = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Adiciona o primeiro botão de página
    if (startPage > 1) {
      buttons.push(
        <Button
          key={1}
          variant="outline"
          size="sm"
          onClick={() => onChange(1)}
          className="h-8 w-8 p-0"
        >
          1
        </Button>
      );

      // Adiciona elipses se necessário
      if (startPage > 2) {
        buttons.push(
          <span key="start-ellipsis" className="px-2">
            ...
          </span>
        );
      }
    }

    // Adiciona os botões de página
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <Button
          key={i}
          variant={currentPage === i ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(i)}
          className={cn("h-8 w-8 p-0", 
            currentPage === i && "pointer-events-none"
          )}
          disabled={currentPage === i}
        >
          {i}
        </Button>
      );
    }

    // Adiciona elipses finais e último botão se necessário
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(
          <span key="end-ellipsis" className="px-2">
            ...
          </span>
        );
      }

      buttons.push(
        <Button
          key={totalPages}
          variant="outline"
          size="sm"
          onClick={() => onChange(totalPages)}
          className="h-8 w-8 p-0"
        >
          {totalPages}
        </Button>
      );
    }

    return buttons;
  };

  return (
    <div className={cn("flex items-center justify-center space-x-2", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {renderPageButtons()}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages || totalPages === 0}
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
} 