import type { Program } from '../../lib/api';

export type FindCourseFilters = {
  search?: string;
  countryId?: string;
  level?: string;
};

export type FindCourseState = {
  programs: Program[];
  total: number;
  loading: boolean;
  error?: string | null;
  filters: FindCourseFilters;
  offset: number;
};
