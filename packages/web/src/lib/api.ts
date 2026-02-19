export type Country = {
  id?: string | number;
  _id?: string;
  name: string;
  isoCode: string;
};

export type Program = {
  id?: string | number;
  _id?: string;
  universityName: string;
  programName: string;
  description?: string;
  country?: Country;
  location?: string;
  levelOfStudy?: string;
  concentration?: string;
  languageOfStudy?: string;
  tuitionFeePerYear?: number;
  applicationFee?: number;
  intakes?: string;
  deadlines?: string;
  durationInYears?: string;
};

export type AdminUser = {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  role: 'admin' | 'manager' | 'employee';
  roles?: Array<'admin' | 'manager' | 'employee'>;
};

export type LeadUser = {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  role: 'student' | 'admin' | 'manager' | 'employee';
  createdAt: string;
};

export type AdminListUser = LeadUser & {
  lastLoginAt?: string | null;
  roles?: Array<'admin' | 'manager' | 'employee'>;
  countryIds?: number[];
};

export type LeadConversationStatus = 'new' | 'contacted' | 'follow_up' | 'interested' | 'not_interested' | 'closed';

export type LeadConversation = {
  id: number;
  userId: number;
  lookingFor?: string | null;
  conversationStatus: LeadConversationStatus;
  notes?: string | null;
  reminderAt?: string | null;
  reminderDone: boolean;
  lastContactedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    name: string;
    email?: string | null;
    phone?: string | null;
    city?: string | null;
  };
};

export type TodayReminder = {
  id: number;
  userId: number;
  userName: string;
  userEmail?: string | null;
  userPhone?: string | null;
  conversationStatus: LeadConversationStatus;
  lookingFor?: string | null;
  notes?: string | null;
  reminderAt: string;
};

export type EmployeeTask = {
  id: number;
  applicantName: string;
  email: string;
  phone?: string | null;
  status: 'submitted' | 'reviewing' | 'accepted' | 'rejected';
  notes?: string | null;
  createdAt: string;
  countryId?: number | null;
  countryName?: string | null;
  countryIsoCode?: string | null;
  programId?: number | null;
  programName?: string | null;
  universityName?: string | null;
  linkedUserId?: number | null;
  linkedUserName?: string | null;
  linkedUserEmail?: string | null;
  linkedUserPhone?: string | null;
  linkedUserCity?: string | null;
  taskStatus?: 'under_process' | 'completed';
  taskNotes?: string | null;
  taskUpdatedAt?: string | null;
  taskAgingStatus?: 'on_time' | 'aging' | 'critical' | null;
};

export type LeadsSummary = {
  totalLeads: number;
  recentLoginCount: number;
  dailyRegistrations: Array<{ day: string; count: number }>;
  recentUsers: LeadUser[];
  todaysRemindersCount: number;
  todaysReminders: TodayReminder[];
  usersByLocation: Array<{ location: string; count: number }>;
};

export type TaskAnalytics = {
  employeeTasks: Array<{
    employeeUserId: number;
    employeeName: string;
    taskCount: number;
  }>;
  countryTasks: Array<{
    countryName: string;
    taskCount: number;
  }>;
  taskAging: {
    onTime: number;
    aging: number;
    critical: number;
    total: number;
  };
};

export type AdminApplication = {
  id: number;
  applicantName: string;
  email: string;
  phone?: string;
  countryOfResidence?: string;
  statement?: string;
  status: 'submitted' | 'reviewing' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
  programName?: string;
  universityName?: string;
  userName?: string;
  userEmail?: string;
};

export type ApplicationInput = {
  program?: string;
  programId?: string | number;
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

export type AdminEvent = {
  id: number;
  degree: string;
  program: string;
  university: string;
  logo?: string | null;
  title: string;
  eventDate: string;
  createdAt?: string;
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "Request failed");
  }
  return res.json();
}

function normalizeProgram(program: Program): Program {
  if (program._id || program.id === undefined || program.id === null) return program;
  return {
    ...program,
    _id: String(program.id)
  };
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
  const programs = await handleResponse<Program[]>(res);
  return programs.map(normalizeProgram);
}

export async function submitApplication(input: ApplicationInput) {
  const resolvedProgramId = input.programId ?? input.program;
  if (!resolvedProgramId) {
    throw new Error("Missing program id");
  }

  const payload = {
    ...input,
    programId: resolvedProgramId
  };

  const res = await fetch(`${API_URL}/api/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function fetchFeatured(): Promise<FeaturedUniversity[]> {
  const res = await fetch(`${API_URL}/api/featured`);
  return handleResponse<FeaturedUniversity[]>(res);
}

export async function createFeatured(input: {
  countryId: number;
  programId: number;
  applicationFee?: number | null;
  universityImage?: string | null;
  discount?: number | null;
}): Promise<FeaturedUniversity> {
  const res = await fetch(`${API_URL}/api/featured`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  return handleResponse<FeaturedUniversity>(res);
}

export async function updateFeatured(
  id: number,
  input: Partial<{
    countryId: number;
    programId: number;
    applicationFee: number | null;
    universityImage: string | null;
    discount: number | null;
  }>
): Promise<FeaturedUniversity> {
  const res = await fetch(`${API_URL}/api/featured/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  return handleResponse<FeaturedUniversity>(res);
}

export async function deleteFeatured(id: number): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/api/featured/${id}`, {
    method: 'DELETE'
  });
  return handleResponse<{ success: boolean }>(res);
}

export async function fetchAdminEvents(): Promise<AdminEvent[]> {
  const res = await fetch(`${API_URL}/api/events/admin`);
  return handleResponse<AdminEvent[]>(res);
}

export async function createAdminEvent(input: {
  degree: string;
  program: string;
  university: string;
  logo?: string | null;
  title: string;
  eventDate: string;
}): Promise<AdminEvent> {
  const res = await fetch(`${API_URL}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  return handleResponse<AdminEvent>(res);
}

export async function updateAdminEvent(
  id: number,
  input: Partial<{
    degree: string;
    program: string;
    university: string;
    logo: string | null;
    title: string;
    eventDate: string;
  }>
): Promise<AdminEvent> {
  const res = await fetch(`${API_URL}/api/events/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  return handleResponse<AdminEvent>(res);
}

export async function deleteAdminEvent(id: number): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/api/events/${id}`, {
    method: 'DELETE'
  });
  return handleResponse<{ success: boolean }>(res);
}

export async function adminLogin(input: { email: string; password: string }): Promise<AdminUser> {
  const res = await fetch(`${API_URL}/api/auth/admin-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return handleResponse<AdminUser>(res);
}

export async function fetchAdminApplications(): Promise<AdminApplication[]> {
  const res = await fetch(`${API_URL}/api/applications`);
  return handleResponse<AdminApplication[]>(res);
}

export async function fetchEmployeeTasks(userId: number): Promise<EmployeeTask[]> {
  const url = new URL(`${API_URL}/api/applications/employee-tasks`);
  url.searchParams.set('userId', String(userId));
  const res = await fetch(url.toString());
  return handleResponse<EmployeeTask[]>(res);
}

export async function fetchTaskAnalytics(): Promise<TaskAnalytics> {
  const res = await fetch(`${API_URL}/api/applications/task-analytics`);
  return handleResponse<TaskAnalytics>(res);
}

export async function updateEmployeeTask(input: {
  applicationId: number;
  employeeUserId: number;
  taskStatus: 'under_process' | 'completed';
  taskNotes?: string | null;
}): Promise<{
  id: number;
  applicationId: number;
  employeeUserId: number;
  taskStatus: 'under_process' | 'completed';
  taskNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}> {
  const res = await fetch(`${API_URL}/api/applications/employee-tasks/${input.applicationId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employeeUserId: input.employeeUserId,
      taskStatus: input.taskStatus,
      taskNotes: input.taskNotes ?? null
    })
  });
  return handleResponse(res);
}

export async function updateProgram(
  programId: string | number,
  payload: Partial<{
    programName: string;
    universityName: string;
    concentration: string;
    levelOfStudy: string;
    location: string;
    languageOfStudy: string;
    tuitionFeePerYear: number | null;
    applicationFee: number | null;
    intakes: string;
    deadlines: string;
    countryId: string | number | null;
  }>
): Promise<Program> {
  const res = await fetch(`${API_URL}/api/programs/${programId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const program = await handleResponse<Program>(res);
  return normalizeProgram(program);
}

export async function fetchLeadsSummary(): Promise<LeadsSummary> {
  const res = await fetch(`${API_URL}/api/auth/leads-summary`);
  return handleResponse<LeadsSummary>(res);
}

export async function fetchAdminUsers(): Promise<AdminListUser[]> {
  const res = await fetch(`${API_URL}/api/auth/users`);
  return handleResponse<AdminListUser[]>(res);
}

export async function createAdminUser(input: {
  name: string;
  email: string;
  phone?: string;
  city?: string;
  role?: 'student' | 'admin' | 'manager' | 'employee';
  roles?: Array<'admin' | 'manager' | 'employee'>;
  countryIds?: number[];
  password?: string;
}): Promise<AdminListUser> {
  const res = await fetch(`${API_URL}/api/auth/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  return handleResponse<AdminListUser>(res);
}

export async function fetchLeadConversations(): Promise<LeadConversation[]> {
  const res = await fetch(`${API_URL}/api/lead-conversations`);
  return handleResponse<LeadConversation[]>(res);
}

export async function upsertLeadConversation(
  userId: number,
  payload: Partial<{
    lookingFor: string | null;
    conversationStatus: LeadConversationStatus;
    notes: string | null;
    reminderAt: string | null;
    reminderDone: boolean;
    lastContactedAt: string | null;
  }>
): Promise<LeadConversation> {
  const res = await fetch(`${API_URL}/api/lead-conversations/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return handleResponse<LeadConversation>(res);
}
