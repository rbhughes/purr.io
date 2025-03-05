"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";
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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { parseUwiInput } from "@/lib/purr_utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronsUpDown } from "lucide-react";
import PaginationManager from "../_api/pagination";
import { searchRasters, RepoSearchParams } from "../_api/dyna_client";

export default function MyForm() {
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasMoreResults, setHasMoreResults] = useState<boolean>(true);
  // const [paginationToken, setPaginationToken] = useState<string | null>(null);

  const pm = React.useRef<PaginationManager>(new PaginationManager());

  const maxResultsOptions = [2, 4, 7, 50];

  const formSchema = z.object({
    maxResults: z.number(),
    uwiList: z.string().min(2, {
      message: "Partial UWI should be at least 2 characters",
    }),
    curve: z.string().nullable().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      maxResults: 10,
      uwiList: "",
      curve: null,
    },
  });

  async function handleSearch(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await searchRasters({
        maxResults: values.maxResults,
        uwis: parseUwiInput(values.uwiList),
        curve: values.curve || null,
        paginationToken: pm.current.currentToken, // Send raw token
      });

      // Always replace results on initial search
      // if (!pm.currentToken) {
      //   setResults(response.data);
      // } else {
      //   setResults((prev) => [...prev, ...response.data]);
      // }
      setResults((prev) =>
        pm.current.currentToken ? [...prev, ...response.data] : response.data
      );

      // Directly store the API's token without modification
      pm.current.currentToken = response.metadata?.paginationToken || null;
      setHasMoreResults(!!pm.current.currentToken);

      // Debug logs
      console.log("Current token:", pm.current.currentToken);
      console.log(
        "Response data:",
        response.data.map((x) => x.sk)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    pm.current.currentToken = null;
    setResults([]);
    setHasMoreResults(true);
    await handleSearch(values);
  }

  function handleLoadMore() {
    handleSearch(form.getValues());
  }

  return (
    <div className="flex flex-col items-center p-4 bg-green-300">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 max-w-[90%] mx-auto py-10 w-full"
        >
          <FormField
            control={form.control}
            name="maxResults"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Number</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="noShadow"
                        role="combobox"
                        className={cn(
                          "w-[200px] justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value || "max page results"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[150px] p-0">
                    <div className="p-2">
                      {maxResultsOptions.map((number) => (
                        <Button
                          key={number}
                          className="w-full justify-start"
                          onClick={() => form.setValue("maxResults", number)}
                        >
                          {number}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <FormDescription>Max page size</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="uwiList"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>UWIs</FormLabel>
                <FormControl>
                  <Textarea placeholder="" {...field} />
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
            name="curve"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Curves</FormLabel>
                <FormControl>
                  <Input
                    placeholder=""
                    type="text"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormDescription>Curve mnemonic, class, etc.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Submit</Button>
        </form>
      </Form>

      <div className="w-full max-w-[90%] mt-8">
        {isLoading && (
          <div className="p-4 bg-yellow-100 mb-4">Loading results...</div>
        )}

        {error && (
          <div className="p-4 text-red-500 bg-red-100 mb-4">{error}</div>
        )}

        {results.length > 0 && (
          <div className="p-4 bg-white rounded-md shadow">
            <h2 className="text-xl font-bold mb-4">Search Results</h2>
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(
                results.map((x) => x.sk),
                null,
                2
              )}
            </pre>
            {hasMoreResults && (
              <Button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="mt-4"
              >
                {isLoading ? "Loading..." : "Load More"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
