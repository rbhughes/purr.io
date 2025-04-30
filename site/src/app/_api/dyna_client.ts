const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
import { Repo } from "@/ts/repo";
import { Job } from "@/ts/job";
import { Raster, DT_Raster, dtRasterKeys } from "@/ts/raster";

const ENDPOINTS = {
  GET_REPOS: "/repos",
  SEARCH_RASTERS: "/search",
  CREATE_JOB: "jobs",
  GET_JOB_BY_ID: (id: string) => `/jobs/${id}`,
};

type HttpMethod = "GET" | "POST" | "DELETE";

interface ApiResponse<T> {
  data: T;
  status: number;
}

interface ResponseMetadata {
  returnedCount?: number;
  totalRequested?: number;
  paginationToken?: string;
  generatedAt?: string;
}

interface FullRasterResponse {
  data: Raster[];
  metadata: ResponseMetadata;
}

interface FilteredRasterResponse {
  data: DT_Raster[];
  metadata: ResponseMetadata;
}

// function filterRasterResponse(
//   response: FullRasterResponse
// ): FilteredRasterResponse {
//   const filteredData = response.data.map((item) =>
//     dtRasterKeys.reduce((acc, key) => {
//       if (item[key] !== undefined) acc[key] = item[key];
//       return acc;
//     }, {} as DT_Raster)
//   );

//   return {
//     data: filteredData,
//     metadata: response.metadata,
//   };
// }

function filterRasterResponse(
  response: FullRasterResponse,
): FilteredRasterResponse {
  const filteredData = response.data.map((item) => {
    const result: DT_Raster = {} as DT_Raster;

    for (const key of dtRasterKeys) {
      const value = item[key];
      if (value !== undefined) {
        // Type-safe assignment using direct type assertion
        result[key] = value as DT_Raster[typeof key];
      }
    }

    return result;
  });

  return {
    data: filteredData,
    metadata: response.metadata,
  };
}

//////////////////////////

const client = {
  request: async <T, D = unknown>(
    endpoint: string,
    method: HttpMethod,
    data?: D,
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
  post: <T, D = unknown>(endpoint: string, data?: D) =>
    client.request<T, D>(endpoint, "POST", data),
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

export const createJob = async (job: Job): Promise<ApiResponse<Job>> => {
  try {
    const response = await client.post<Job>(ENDPOINTS.CREATE_JOB, job);
    return response;
  } catch (error) {
    console.error("Error creating job:", error);
    throw error;
  }
};

export const getJobById = async (id: string): Promise<ApiResponse<Job>> => {
  try {
    const response = await client.get<Job>(ENDPOINTS.GET_JOB_BY_ID(id));
    return response;
  } catch (error) {
    console.error("Error fetching job by ID:", error);
    throw error;
  }
};

export interface RepoSearchParams {
  maxResults: number;
  uwis: string[];
  wordz?: string | null | undefined;
  paginationToken?: string | null | undefined;
}

export const searchRasters = async (
  params: RepoSearchParams,
): Promise<FilteredRasterResponse> => {
  try {
    const payload = {
      ...params,
      paginationToken: params.paginationToken || undefined,
    };

    const response = await client.post<FullRasterResponse>(
      ENDPOINTS.SEARCH_RASTERS,
      payload,
    );

    console.log("$$$$$$$$$$$$$$$$$$");
    console.log(payload);
    console.log("------------------------------------");
    console.log(response);
    console.log("$$$$$$$$$$$$$$$$$$");

    const filteredRasters = filterRasterResponse(response.data);
    return filteredRasters;
  } catch (error) {
    console.error("Search error:", error);
    throw error;
  }
};
