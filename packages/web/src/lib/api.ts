export type Country = { id?: string | number; _id?: string; name: string; isoCode: string };

export type Program = {
  _id: string;
  universityName: string;
  programName: string;
  country?: Country;
  location?: string;
  levelOfStudy?: string;
  concentration?: string;
  languageOfStudy?: string;
  tuitionFeePerYear?: number;
  applicationFee?: number;
  intakes?: string;
  deadlines?: string;
};

export type ApplicationInput = {
  program: string;
  applicantName: string;
  email: string;
  phone?: string;
  statement?: string;
  countryId?: string | number | null;
  notes?: string;
};

export type FeaturedUniversity = {
  id: number;
  universityImage?: string;
  discount?: number | null;
  programId: number;
  programName: string;
  universityName: string;
  applicationFee?: number | null;
  countryId: number;
  countryName: string;
  countryIso: string;
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "Request failed");
  }
  return res.json();
}

export async function fetchCountries(): Promise<Country[]> {
  const res = await fetch(`${API_URL}/api/countries`);
  return handleResponse<Country[]>(res);
}

export async function searchPrograms(params: {
  search?: string;
  country?: string;
  level?: string;
}): Promise<Program[]> {
  const url = new URL(`${API_URL}/api/programs`);
  if (params.search) url.searchParams.set("search", params.search);
  if (params.country) url.searchParams.set("country", params.country);
  if (params.level) url.searchParams.set("level", params.level);
  const res = await fetch(url.toString());
  return handleResponse<Program[]>(res);
}

export async function submitApplication(input: ApplicationInput) {
  const res = await fetch(`${API_URL}/api/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse(res);
}

export async function fetchFeatured(): Promise<FeaturedUniversity[]> {
  const res = await fetch(`${API_URL}/api/featured`);
  return handleResponse<FeaturedUniversity[]>(res);
}
