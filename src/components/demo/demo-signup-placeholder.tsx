import Link from "next/link";
import { DemoHeader } from "@/components/layout/demo-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export function DemoSignupPlaceholder({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <DemoHeader title={title} />
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 min-h-[calc(100dvh-10rem)] md:min-h-[calc(100dvh-9rem)]">
        <Card className="w-full max-w-lg shadow-sm">
          <CardHeader className="space-y-2 px-6 pt-6 text-center sm:px-8 sm:pt-8">
            <CardTitle className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</CardTitle>
            <CardDescription className="mx-auto max-w-md text-pretty text-sm leading-relaxed sm:text-base">
              {body}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center px-6 pb-8 pt-2 sm:px-8 sm:pb-8">
            <Link href="/signup" className={cn(buttonVariants({ size: "default" }), "min-w-[11rem] justify-center")}>
              Create free account
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
