"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { Search, CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CHANNEL_CONFIG } from "@/lib/constants";
import type { AdminUser } from "@/types/admin";
import type { Platform } from "@/types";

interface Props {
  users: AdminUser[];
}

export function AdminUsersClient({ users }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Users");
  const [channelFilter, setChannelFilter] = useState("Any");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const clickCount = useRef(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, []);

  useEffect(() => {
    if (!calendarOpen) return;
    updatePosition();
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) return;
      setCalendarOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [calendarOpen, updatePosition]);

  const filtered = useMemo(() => {
    let result = users;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.full_name ?? "").toLowerCase().includes(q)
      );
    }

    if (statusFilter === "Active") {
      result = result.filter((u) => u.status === "active");
    } else if (statusFilter === "Banned") {
      result = result.filter((u) => u.status === "banned");
    }

    if (channelFilter === "Connected") {
      result = result.filter((u) => u.channels.length > 0);
    } else if (channelFilter === "Not Connected") {
      result = result.filter((u) => u.channels.length === 0);
    }

    if (dateRange?.from) {
      const from = startOfDay(dateRange.from);
      result = result.filter((u) => !isBefore(parseISO(u.created_at), from));
    }
    if (dateRange?.to) {
      const to = endOfDay(dateRange.to);
      result = result.filter((u) => !isAfter(parseISO(u.created_at), to));
    }

    return result;
  }, [users, search, statusFilter, channelFilter, dateRange]);

  const dateLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, "MMM d")} – ${format(dateRange.to, "MMM d, yyyy")}`
      : `From ${format(dateRange.from, "MMM d, yyyy")}`
    : "Filter by join date";

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "All Users")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Users">All Users</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Banned">Banned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={(v) => setChannelFilter(v ?? "Any")}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Any">All Channels</SelectItem>
                <SelectItem value="Connected">Connected</SelectItem>
                <SelectItem value="Not Connected">Not Connected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => {
                setCalendarOpen((prev) => !prev);
                clickCount.current = 0;
              }}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <CalendarIcon className="size-4" />
              {dateLabel}
            </button>
            {dateRange && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2 text-muted-foreground"
                onClick={() => setDateRange(undefined)}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
          {calendarOpen &&
            createPortal(
              <div
                ref={dropdownRef}
                className="fixed z-[9999] rounded-lg border bg-popover p-2 shadow-lg"
                style={{ top: dropdownPos.top, left: dropdownPos.left }}
              >
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range ?? undefined);
                    clickCount.current += 1;
                    if (clickCount.current >= 2) {
                      clickCount.current = 0;
                      setCalendarOpen(false);
                    }
                  }}
                  numberOfMonths={2}
                  defaultMonth={new Date(new Date().getFullYear(), new Date().getMonth() - 1)}
                />
              </div>,
              document.body
            )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b">
            <p className="text-sm font-medium">Users ({filtered.length})</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Channels</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.full_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={user.status === "active" ? "default" : "destructive"}
                        className={
                          user.status === "active"
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                            : ""
                        }
                      >
                        {user.status === "active" ? "Active" : "Banned"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.channels.length === 0 ? (
                        <span className="text-muted-foreground text-xs">None</span>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {user.channels.map((ch, i) => {
                            const config = CHANNEL_CONFIG[ch.platform as Platform];
                            return (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
                                title={ch.name}
                              >
                                <span
                                  className="size-1.5 rounded-full"
                                  style={{ backgroundColor: config?.color ?? "#6B7280" }}
                                />
                                {config?.label ?? ch.platform}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(parseISO(user.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/users/${user.id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
