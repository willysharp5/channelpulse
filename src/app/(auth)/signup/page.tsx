"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function SignupPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white mb-2">
          <Zap className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>
          Start tracking your multichannel sales in minutes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Business Name</Label>
          <Input id="name" placeholder="My Ecommerce Store" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="seller@example.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="••••••••" />
        </div>
        <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white">
          Create Account
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Free plan includes 1 channel and 100 orders/month
        </p>
        <Separator />
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-amber-600 hover:text-amber-700 font-medium">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
