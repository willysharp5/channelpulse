"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white mb-2">
          <Zap className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>
          Sign in to your ChannelPulse account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="seller@example.com" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="#" className="text-xs text-amber-600 hover:text-amber-700">
              Forgot password?
            </Link>
          </div>
          <Input id="password" type="password" placeholder="••••••••" />
        </div>
        <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white">
          Sign In
        </Button>
        <Separator />
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-amber-600 hover:text-amber-700 font-medium">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
