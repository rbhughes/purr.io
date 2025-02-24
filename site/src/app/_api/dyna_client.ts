const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
import { Repo } from "@/types/repo";

const ENDPOINTS = {
  GET_REPOS: "/repos",
  SEARCH_RASTERS: "/rasters",
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

    console.log("-----------");
    console.log(`${BASE_URL}${endpoint}`);
    console.log("-----------");

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

interface RepoSearchParams {
  uwis: string[];
  curves: string[];
}
export const searchRasters = async (params: RepoSearchParams): Promise<any> => {
  const { uwis, curves } = params;
  try {
    const payload = { uwis, curves };
    console.log("========================");
    console.log(payload);
    console.log("========================");
    const response = await client.post<any>(ENDPOINTS.SEARCH_RASTERS, payload);
    return response.data;
  } catch (error) {
    console.error("Error searching rasters:", error);
    throw error; // Re-throw error for further handling
  }
};
