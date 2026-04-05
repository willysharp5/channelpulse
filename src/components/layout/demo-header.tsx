"use client";

import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { DateRangePicker } from "./date-range-picker";
import { ThemeToggle } from "./theme-toggle";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

interface DemoHeaderProps {
  title?: string;
}

export function DemoHeader({ title = "Overview" }: DemoHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      <Breadcrumb className="hidden md:flex">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="text-sm font-medium">{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        <span data-tour="date-range" className="inline-flex">
          <DateRangePicker />
        </span>
        <ThemeToggle />
        <Link
          href="/signup"
          className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}
        >
          Sign up
        </Link>
      </div>
    </header>
  );
}
