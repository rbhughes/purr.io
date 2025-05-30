"use client";
import React, { useState } from "react";
import { cn } from "@/lib/utils";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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
import {
  Card,
  CardFooter,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { parseUwiInput } from "@/lib/purr_utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronsUpDown } from "lucide-react";

import { DT_Raster } from "@/ts/raster";
import PaginationManager from "../_api/pagination";
import { searchRasters } from "../_api/dyna_client";
import SearchResults from "./search-results";

export default function RasterSearchForm() {
  const [results, setResults] = useState<DT_Raster[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasMoreResults, setHasMoreResults] = useState<boolean>(true);
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const [currentMaxResults, setCurrentMaxResults] = useState(10);

  const pm = React.useRef<PaginationManager>(new PaginationManager());

  const maxResultsOptions = [5, 10, 50, 100];

  const formSchema = z.object({
    maxResults: z.number(),
    uwiList: z.string().min(2, {
      message: "Partial UWI should be at least 2 characters",
    }),
    wordz: z.string().nullable().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      maxResults: 10,
      uwiList: "",
      wordz: null,
    },
  });

  async function handleSearch(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await searchRasters({
        //maxResults: values.maxResults,
        maxResults: currentMaxResults,
        uwis: parseUwiInput(values.uwiList),
        wordz: values.wordz || null,
        paginationToken: pm.current.currentToken, // Send raw token
      });

      setResults((prev) =>
        pm.current.currentToken ? [...prev, ...response.data] : response.data,
      );

      pm.current.currentToken = response.metadata?.paginationToken || null;
      //setHasMoreResults(!!pm.current.currentToken);
      setHasMoreResults(!!pm.current.currentToken && response.data.length > 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setCurrentMaxResults(values.maxResults);
    pm.current.currentToken = null;
    setResults([]);
    //setHasMoreResults(true);
    setHasMoreResults(false);
    await handleSearch(values);
  }

  const handleLoadMore = async () => {
    await handleSearch(form.getValues());
  };

  // Resets react-hook-form fields to defaultValues; reset pagination token
  const handleReset = () => {
    form.reset();
    setResults([]);
    setError(null);
    pm.current.currentToken = null;
    setHasMoreResults(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 md:flex-row md:gap-8">
        <Card className="w-[400px] flex-shrink-0 brute-white brute-shadow grid-paper">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className=" mx-auto w-full"
            >
              <CardHeader>
                <CardTitle>Raster and Calibration File Search</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                <FormField
                  control={form.control}
                  name="uwiList"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>UWIs</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder=""
                          {...field}
                          className="brute-form"
                        />
                      </FormControl>
                      <FormDescription>
                        Enter UWI(s) or partial UWI-prefixes with commas
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* add vertical space here */}
                <FormField
                  control={form.control}
                  name="wordz"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Search Terms</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder=""
                          //type="text"
                          {...field}
                          value={field.value ?? ""}
                          className="brute-form"
                        />
                      </FormControl>
                      <FormDescription>
                        Filter by mnemonic, curve class, filename, etc.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="flex mt-4 justify-between">
                <FormField
                  control={form.control}
                  name="maxResults"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Results per Page</FormLabel>
                      <Popover
                        open={isPopoverOpen}
                        onOpenChange={setIsPopoverOpen}
                      >
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
                            {maxResultsOptions.map((num) => (
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
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      {/* <FormDescription>Limit results per page</FormDescription> */}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <Button
                    type="button"
                    variant="neutral"
                    onClick={handleReset}
                    className="brute-shadow mt-5 mr-4"
                  >
                    Reset
                  </Button>
                  <Button
                    variant="default"
                    type="submit"
                    className="brute-shadow mt-5"
                  >
                    Search
                  </Button>
                </div>
              </CardFooter>
            </form>
          </Form>
        </Card>

        <SearchResults
          results={results}
          pageSize={currentMaxResults}
          isLoading={isLoading}
          error={error}
          hasMoreResults={hasMoreResults}
          onLoadMore={handleLoadMore}
        />
        {/* <Card className="flex-1 min-w-0 brute-white brute-shadow grid-paper">
          <CardContent>
            <RasterDataTable
              data={results}
              pageSize={currentMaxResults}
              onLoadMore={handleLoadMore}
              hasMoreResults={hasMoreResults}
            />
          </CardContent>
        </Card> */}
      </div>

      {/* <div className="w-full max-w-[90%] mt-8">
        {isLoading && (
          <div className="p-4 bg-yellow-100 mb-4">Loading results...</div>
        )}

        {error && (
          <div className="p-4 text-red-500 bg-red-100 mb-4">{error}</div>
        )}
      </div> */}

      {/* <div className="flex-1 bg-blue-200 p-4">
        Bottom Tray (Will hold selected table items) I will hold stats until
        search happens
        {results.length > 0 && (
          <div className="p-4 bg-white rounded-md shadow">
            <h2 className="text-xl font-bold mb-4">Search Results</h2>
            <ul>
              {results.map((r) => (
                <li key={r.sk}>
                  {r.uwi} | {r.calib_file_name} | {r.raster_file_name}
                </li>
              ))}
            </ul>

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
      </div> */}
    </div>
  );
}
