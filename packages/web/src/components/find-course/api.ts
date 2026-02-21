import type { Program } from '../../lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:6942';

export async function fetchProgramsPaginated(params: {
  search?: string;
  countryId?: string;
  concentration?: string;
  location?: string;
  university?: string;
  offset?: number;
  limit?: number;
  token?: string;
}): Promise<{ items: Program[]; total: number }> {
  const url = new URL(`${API_URL}/api/programs/paginated`);
  if (params.search) url.searchParams.set('search', params.search);
  if (params.countryId) url.searchParams.set('countryId', params.countryId);
  if (params.concentration) url.searchParams.set('concentration', params.concentration);
  if (params.location) url.searchParams.set('location', params.location);
  if (params.university) url.searchParams.set('university', params.university);
  url.searchParams.set('offset', String(params.offset ?? 0));
  url.searchParams.set('limit', String(params.limit ?? 10));
  if (params.token) url.searchParams.set('current_url_token_request', params.token);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(await res.text());
  const items = (await res.json()) as Program[];
  // No total from API; approximate using length + offset (best effort)
  return { items, total: (params.offset ?? 0) + items.length };
}

export type ConcentrationItem = {
  concentrationId?: number;
  concentrationName: string;
  concentration?: string;
  programsCount: number;
};

export async function fetchConcentrations(countryId?: string): Promise<ConcentrationItem[]> {
  const url = new URL(`${API_URL}/api/concentrations`);
  if (countryId) url.searchParams.set('country', countryId);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as ConcentrationItem[];
}

export type LocationItem = {
  location: string;
  locationName: string;
  programsCount: number;
};

export async function fetchLocations(countryId?: string): Promise<LocationItem[]> {
  const url = new URL(`${API_URL}/api/locations`);
  if (countryId) url.searchParams.set('country', countryId);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as LocationItem[];
}

export type UniversityItem = {
  universityName: string;
  programsCount: number;
};

export async function fetchUniversities(countryId?: string): Promise<UniversityItem[]> {
  const url = new URL(`${API_URL}/api/programs/universities`);
  if (countryId) url.searchParams.set('country', countryId);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as UniversityItem[];
}

export type ScholarshipItem = {
  id: number;
  name: string;
  links?: string | null;
  duration?: string | null;
  deadline?: string | null;
  description?: string | null;
  countryId: number;
  countryName: string;
  countryIso: string;
};

export async function fetchScholarships(countryId?: string): Promise<ScholarshipItem[]> {
  const url = new URL(`${API_URL}/api/scholarships`);
  if (countryId) url.searchParams.set('country', countryId);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as ScholarshipItem[];
}

export type StudyGuideTopicItem = {
  id: number;
  name: string;
  description?: string | null;
};

export type StudyGuideItem = {
  id: number;
  title: string;
  summary?: string | null;
  content?: string | null;
  links?: string | null;
  topicId: number;
  topicName: string;
  countryId: number;
  countryName: string;
  countryIso: string;
};

export async function fetchStudyGuideTopics(): Promise<StudyGuideTopicItem[]> {
  const res = await fetch(`${API_URL}/api/study-guides/topics`);
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as StudyGuideTopicItem[];
}

export async function fetchStudyGuides(params: { countryId?: string; topicId?: number }): Promise<StudyGuideItem[]> {
  const url = new URL(`${API_URL}/api/study-guides`);
  if (params.countryId) url.searchParams.set('country', params.countryId);
  if (params.topicId) url.searchParams.set('topicId', String(params.topicId));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as StudyGuideItem[];
}

export type ExamItem = {
  id: number;
  name: string;
  links?: string | null;
  duration?: string | null;
  examDate?: string | null;
  description?: string | null;
  countryId: number;
  countryName: string;
  countryIso: string;
};

export async function fetchExams(countryId?: string): Promise<ExamItem[]> {
  const url = new URL(`${API_URL}/api/exams`);
  if (countryId) url.searchParams.set('country', countryId);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as ExamItem[];
}
