'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';

const demoSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name.'),
});

export default function UiPreview() {
  const form = useForm<z.infer<typeof demoSchema>>({
    resolver: zodResolver(demoSchema),
    defaultValues: { name: '' },
  });
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-5 md:px-6">
      <h1 className="text-xl font-semibold">UI primitives</h1>
      <p className="text-sm text-gray-700">Temporary foundation preview.</p>
      <section className="space-y-3" aria-labelledby="buttons">
        <h2 id="buttons" className="text-sm font-semibold">
          Buttons and feedback
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => toast.success('Preview ready')}>
            Show toast
          </Button>
          <Button variant="outline">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button disabled>Disabled</Button>
        </div>
        <Badge variant="secondary">Preview</Badge>
        <Avatar>
          <AvatarFallback>KA</AvatarFallback>
        </Avatar>
        <Skeleton className="h-4 w-32" />
        <Separator />
      </section>
      <section className="space-y-3" aria-labelledby="fields">
        <h2 id="fields" className="text-sm font-semibold">
          Fields
        </h2>
        <Label htmlFor="demo-input">Example input</Label>
        <Input id="demo-input" placeholder="Enter text" />
        <Label htmlFor="demo-textarea">Example description</Label>
        <Textarea id="demo-textarea" placeholder="Enter a description" />
        <Label htmlFor="demo-select">Example selection</Label>
        <Select defaultValue="one">
          <SelectTrigger id="demo-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="one">Option one</SelectItem>
            <SelectItem value="two">Option two</SelectItem>
          </SelectContent>
        </Select>
      </section>
      <section className="space-y-3" aria-labelledby="overlays">
        <h2 id="overlays" className="text-sm font-semibold">
          Overlays
        </h2>
        <div className="flex flex-wrap gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Example dialog</DialogTitle>
                <DialogDescription>
                  Focus stays inside this dialog until it closes.
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">Open confirmation</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm preview action?</AlertDialogTitle>
                <AlertDialogDescription>
                  This example makes no changes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Confirm</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Open sheet</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Example sheet</SheetTitle>
                <SheetDescription>Press Escape to close.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Open menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Example item</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>
      <section className="space-y-3" aria-labelledby="form">
        <h2 id="form" className="text-sm font-semibold">
          Form helpers
        </h2>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(() =>
              toast.success('Example submitted'),
            )}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>Preview validation only.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Submit example</Button>
          </form>
        </Form>
      </section>
    </main>
  );
}
