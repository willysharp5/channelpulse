"use client";

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
import { UserMenu } from "./user-menu";
import { SearchDialog } from "./search-dialog";
import { NotificationPanel } from "./notification-panel";

interface HeaderProps {
  title?: string;
  userEmail?: string;
  userName?: string;
}

export function Header({ title = "Overview", userEmail, userName }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      <Breadcrumb className="hidden md:flex">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="text-sm font-medium">
              {title}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        <SearchDialog />
        <DateRangePicker />
        <NotificationPanel />
        <ThemeToggle />
        <UserMenu email={userEmail} name={userName} />
      </div>
    </header>
  );
}
