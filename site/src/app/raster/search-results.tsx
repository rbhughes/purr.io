// SearchResults.tsx
import React from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import RasterDataTable from "./data-table"; // If you want to use a table view

interface SearchResultsProps {
  results: any[];
  pageSize: number;
  isLoading: boolean;
  error: string | null;
  hasMoreResults: boolean;
  onLoadMore: () => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  pageSize,
  isLoading,
  error,
  hasMoreResults,
  onLoadMore,
}) => {
  return (
    <Card className="flex-1 min-w-0 brute-white brute-shadow grid-paper">
      <CardContent>
        {isLoading && <div>Loading results...</div>}
        {error && <div className="text-red-500">{error}</div>}
        {results.length === 0 && !isLoading && !error && (
          <div>No results found.</div>
        )}
        {results.length > 0 && (
          <RasterDataTable
            data={results}
            pageSize={pageSize}
            onLoadMore={onLoadMore}
            hasMoreResults={hasMoreResults}
          />
        )}
      </CardContent>
      <CardFooter>
        {hasMoreResults && (
          <button onClick={onLoadMore} disabled={isLoading}>
            {isLoading ? "Loading..." : "Load More"}
          </button>
        )}

        {isLoading && (
          <div className="p-4 bg-yellow-100 mb-4">Loading results...</div>
        )}

        {error && (
          <div className="p-4 text-red-500 bg-red-100 mb-4">{error}</div>
        )}
      </CardFooter>
    </Card>
  );
};

export default SearchResults;
