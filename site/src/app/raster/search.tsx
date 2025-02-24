"use client";

import React from "react";
import { parseUwiInput, parseCurveInput } from "@/lib/purr_utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { searchRasters } from "../_api/dyna_client";

export default function RasterSearch() {
  const [results, setResults] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  const formSchema = z.object({
    //TODO: enforce length of 5 and adjust scrubUwiInput too?
    uwiList: z.string().min(2, {
      message: "Partial UWI should be at least 2 characters",
    }),
    curveList: z
      .string()
      .min(2, {
        message: "Curve mnemonic should be at least 2 characters",
      })
      .or(z.literal("")),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      uwiList: "",
      curveList: "",
    },
  });

  // function onSubmit(values: z.infer<typeof formSchema>) {
  //   const uwis = parseUwiInput(values.uwiList);
  //   const curves = parseCurveInput(values.curveList);
  //   const response = await searchRasters({ uwis, curves });
  //   setResults(response);
  //   setError(null);
  // }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const uwis = parseUwiInput(values.uwiList);
      const curves = parseCurveInput(values.curveList);

      const response = await searchRasters({ uwis, curves });
      setResults(response);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults(null);
    }
  }

  return (
    // <div className="font-base bg-red-400 w-[1000px]">
    <div className=" flex justify-center p-4 bg-green-300">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 font-bold bg-blue-300 w-full"
          //className="flex gap-4"
        >
          <div className="flex gap-4">
            <FormField
              control={form.control}
              name="uwiList"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>UWIs</FormLabel>
                  <FormControl>
                    <Input placeholder="" {...field} />
                  </FormControl>
                  <FormDescription>
                    Separate multiple UWIs with commas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="curveList"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Curves</FormLabel>
                  <FormControl>
                    <Input placeholder="" {...field} />
                  </FormControl>
                  <FormDescription>
                    Separate multiple Mnemonics with commas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className=""
          >
            {form.formState.isSubmitting ? "Searching..." : "Search"}
          </Button>
        </form>
      </Form>
      {form.formState.isSubmitting && (
        <div className="p-4 bg-yellow-100">Loading results...</div>
      )}

      {error && <div className="p-4 text-red-500 bg-red-100">{error}</div>}

      {results && (
        <div className="p-4 bg-white rounded-md shadow">
          <h2 className="text-xl font-bold mb-4">Search Results</h2>
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
