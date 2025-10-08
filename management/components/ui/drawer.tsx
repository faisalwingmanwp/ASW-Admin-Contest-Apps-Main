"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Drawer = ({
  children,
  open,
  onOpenChange,
  ...props
}: {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
} & React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/80"
          onClick={() => onOpenChange?.(false)}
        />
      )}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full max-w-xs md:max-w-md transform translate-x-full transition-transform duration-300 ease-in-out bg-white dark:bg-gray-950 shadow-lg",
          open && "translate-x-0"
        )}
        {...props}
      >
        {children}
      </div>
    </>
  )
}

const DrawerTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn("", className)}
    {...props}
  />
))
DrawerTrigger.displayName = "DrawerTrigger"

const DrawerClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none",
      className
    )}
    {...props}
  >
    <X className="h-4 w-4" />
    <span className="sr-only">Close</span>
  </button>
))
DrawerClose.displayName = "DrawerClose"

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 p-4 sm:p-6",
      className
    )}
    {...props}
  />
)
DrawerHeader.displayName = "DrawerHeader"

const DrawerTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-semibold text-lg leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DrawerTitle.displayName = "DrawerTitle"

const DrawerDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DrawerDescription.displayName = "DrawerDescription"

const DrawerContent = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-4 sm:p-6", className)} {...props}>
    {children}
  </div>
)
DrawerContent.displayName = "DrawerContent"

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-4 sm:p-6",
      className
    )}
    {...props}
  />
)
DrawerFooter.displayName = "DrawerFooter"

export {
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
