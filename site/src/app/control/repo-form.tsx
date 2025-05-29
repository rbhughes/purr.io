"use client";
import React, { useState } from "react";
import { AsyncJobButton } from "@/components/async-job-button";

import { cn } from "@/lib/utils";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { FolderPlus } from "lucide-react";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronsUpDown } from "lucide-react";

export default function RepoForm({ onJobComplete }) {
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  const formSchema = z.object({
    suite: z.string(),
    repoPath: z.string().min(3, {
      message: "Path should be at least 3 characters",
    }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      suite: "Petra",
      repoPath: "",
    },
  });

  /*
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setCurrentMaxResults(values.maxResults);
    pm.current.currentToken = null;
    setResults([]);
    //setHasMoreResults(true);
    setHasMoreResults(false);
    await handleSearch(values);
  }
  */
  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className=" mx-auto w-full">
        <CardHeader>
          <CardTitle>Repos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <FormField
            control={form.control}
            name="suite"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Application</FormLabel>
                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="noShadow"
                        role="combobox"
                        className={cn(
                          "w-[100px] justify-between",
                          "brute-form",
                          !field.value && "text-muted-foreground;",
                        )}
                      >
                        {field.value || "max page results"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[120px] p-0 bg-white ">
                    <div className="p-2">
                      {/* {maxResultsOptions.map((num) => (
                              <Button
                                key={num}
                                variant="neutral"
                                className="w-full bg-bg"
                                onClick={() => {
                                  setIsPopoverOpen(false);
                                  form.setValue("maxResults", num);
                                  setCurrentMaxResults(num);
                                }}
                              >
                                {num}
                              </Button>
                            ))} */}
                    </div>
                  </PopoverContent>
                </Popover>
                {/* <FormDescription>Limit results per page</FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="repoPath"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Repo path</FormLabel>
                <FormControl>
                  <Input placeholder="" {...field} className="brute-form" />
                </FormControl>
                <FormDescription>
                  Full Windows path to repo/project
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
        <CardFooter className="flex mt-4 justify-between">
          <div>
            <AsyncJobButton
              icon={FolderPlus}
              title={"Add Repo"}
              directive={"add_petra_repo"}
              payloadItems={[form.getValues()]}
              //onJobComplete={(res) => console.log(res)}
              onJobComplete={onJobComplete}
            />
          </div>
        </CardFooter>
      </form>
    </Form>
  );
}
