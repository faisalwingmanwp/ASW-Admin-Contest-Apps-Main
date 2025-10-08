"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

interface PaginationProps {
  pageCount: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  siblingsCount?: number;
}

export function Pagination({
  pageCount,
  currentPage,
  onPageChange,
  siblingsCount = 1,
}: PaginationProps) {
  // Don't render pagination if only one page
  if (pageCount <= 1) return null;

  // Create array of page numbers to display
  const generatePagination = () => {
    // Always show first page
    const pagination: (number | string)[] = [1];

    // Calculate range of pages to show around current page
    const leftSiblingIndex = Math.max(currentPage - siblingsCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingsCount, pageCount);

    // Add dots if needed and the relevant pages
    if (leftSiblingIndex > 2) {
      pagination.push("...");
    } else if (leftSiblingIndex === 2) {
      pagination.push(2);
    }

    // Add all pages in the middle
    for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
      if (i !== 1 && i !== pageCount) {
        pagination.push(i);
      }
    }

    // Add dots if needed before last page
    if (rightSiblingIndex < pageCount - 1) {
      pagination.push("...");
    } else if (rightSiblingIndex === pageCount - 1) {
      pagination.push(pageCount - 1);
    }

    // Always show last page
    if (pageCount !== 1) {
      pagination.push(pageCount);
    }

    return pagination;
  };

  const pagination = generatePagination();

  return (
    <div className="flex items-center justify-center space-x-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pagination.map((page, i) => {
        // If page is a "..." (dots), render disabled button
        if (page === "...") {
          return (
            <Button 
              key={`dots-${i}`} 
              variant="outline" 
              disabled 
              size="icon"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          );
        }

        // Otherwise render normal page button
        const pageNum = page as number;
        return (
          <Button
            key={pageNum}
            variant={currentPage === pageNum ? "default" : "outline"}
            size="icon"
            onClick={() => onPageChange(pageNum)}
          >
            {pageNum}
          </Button>
        );
      })}

      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
        disabled={currentPage === pageCount}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
