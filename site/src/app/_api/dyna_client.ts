const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
import { Repo } from "@/types/repo";

const ENDPOINTS = {
  GET_REPOS: "/repos",
  SEARCH_RASTERS: "/search",
};

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

interface ApiResponse<T> {
  data: T;
  status: number;
}

const client = {
  request: async <T>(
    endpoint: string,
    method: HttpMethod,
    data?: any
  ): Promise<ApiResponse<T>> => {
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: "valid_thing",
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const responseData: T = await response.json();

    return { data: responseData, status: response.status };
  },
  get: <T>(endpoint: string) => client.request<T>(endpoint, "GET"),
  post: <T>(endpoint: string, data: any) =>
    client.request<T>(endpoint, "POST", data),
  put: <T>(endpoint: string, data: any) =>
    client.request<T>(endpoint, "PUT", data),
  delete: <T>(endpoint: string) => client.request<T>(endpoint, "DELETE"),
};

export const getRepos = async (): Promise<Repo[]> => {
  try {
    const response = await client.get<Repo[]>(ENDPOINTS.GET_REPOS);
    return response.data;
  } catch (error) {
    console.error("Error fetching repos:", error);
    throw error;
  }
};

export interface RepoSearchParams {
  maxResults: number;
  uwis: string[];
  curve?: string | null | undefined;
  paginationToken?: string | null | undefined;
}

interface SearchResponse {
  data: any[];
  metadata: {
    paginationToken?: string;
  };
}

export const searchRasters = async (
  params: RepoSearchParams
): Promise<SearchResponse> => {
  console.log("--------------------------");
  console.log(params);
  console.log("--------------------------");

  try {
    const payload = {
      ...params,
      paginationToken: params.paginationToken || undefined,
    };

    const response = await client.post<SearchResponse>(
      ENDPOINTS.SEARCH_RASTERS,
      payload
    );

    return response.data;
  } catch (error) {
    console.error("Search error:", error);
    throw error;
  }
};
