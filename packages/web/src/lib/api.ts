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
  role: 'student' | 'uploaded' | 'admin' | 'manager' | 'employee';
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
    onTimeCount: number;
    agingCount: number;
    criticalCount: number;
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

export type StudentApplication = {
  id: number;
  programId: number;
  countryId?: number | null;
  status: 'submitted' | 'reviewing' | 'accepted' | 'rejected';
  applicantName: string;
  email: string;
  phone?: string | null;
  createdAt: string;
  programName?: string | null;
  universityName?: string | null;
  countryName?: string | null;
  countryIso?: string | null;
};

export type StudentDocument = {
  id: number;
  documentName: string;
  originalFileName?: string | null;
  fileUrl: string;
  mimeType?: string | null;
  createdAt: string;
};

export type StudentProfile = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  role: 'student' | 'uploaded' | 'admin' | 'manager' | 'employee';
  dob?: string | null;
  gender?: string | null;
  highestQualification?: string | null;
  preferredIntake?: string | null;
  bio?: string | null;
  profilePictureUrl?: string | null;
};

export type InterestedStudent = {
  id: number;
  name: string;
  city?: string | null;
  createdAt: string;
  interestUpdatedAt: string;
};

export type StudentDashboardData = {
  profile: StudentProfile;
  documents: StudentDocument[];
  applications: StudentApplication[];
  interestedStudentsLast6Months: InterestedStudent[];
  relatedCountryId?: number | null;
  relatedPrograms: Program[];
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

export type AdminScholarship = {
  id: number;
  name: string;
  links?: string | null;
  duration?: string | null;
  deadline?: string | null;
  description?: string | null;
  countryId: number;
  countryName: string;
  countryIso: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminStudyGuideTopic = {
  id: number;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminStudyGuide = {
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
  createdAt?: string;
  updatedAt?: string;
};

export type AdminExam = {
  id: number;
  name: string;
  links?: string | null;
  duration?: string | null;
  examDate?: string | null;
  description?: string | null;
  countryId: number;
  countryName: string;
  countryIso: string;
  createdAt?: string;
  updatedAt?: string;
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

export async function fetchProgramsPage(params: {
  search?: string;
  countryId?: string;
  concentration?: string;
  location?: string;
  university?: string;
  offset?: number;
  limit?: number;
}): Promise<{ items: Program[]; total: number }> {
  const url = new URL(`${API_URL}/api/programs/paginated`);
  if (params.search) url.searchParams.set('search', params.search);
  if (params.countryId) url.searchParams.set('countryId', params.countryId);
  if (params.concentration) url.searchParams.set('concentration', params.concentration);
  if (params.location) url.searchParams.set('location', params.location);
  if (params.university) url.searchParams.set('university', params.university);
  url.searchParams.set('offset', String(params.offset ?? 0));
  url.searchParams.set('limit', String(params.limit ?? 50));
  url.searchParams.set('includeTotal', '1');

  const res = await fetch(url.toString());
  const payload = await handleResponse<{ items: Program[]; total: number }>(res);
  return {
    items: payload.items.map(normalizeProgram),
    total: Number(payload.total || 0)
  };
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

export async function fetchAdminScholarships(): Promise<AdminScholarship[]> {
  const res = await fetch(`${API_URL}/api/scholarships`);
  return handleResponse<AdminScholarship[]>(res);
}

export async function createAdminScholarship(input: {
  name: string;
  links?: string | null;
  duration?: string | null;
  deadline?: string | null;
  description?: string | null;
  countryId: number;
}): Promise<AdminScholarship> {
  const res = await fetch(`${API_URL}/api/scholarships`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  return handleResponse<AdminScholarship>(res);
}

export async function updateAdminScholarship(
  id: number,
  input: Partial<{
    name: string;
    links: string | null;
    duration: string | null;
    deadline: string | null;
    description: string | null;
    countryId: number;
  }>
): Promise<AdminScholarship> {
  const res = await fetch(`${API_URL}/api/scholarships/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  return handleResponse<AdminScholarship>(res);
}

export async function deleteAdminScholarship(id: number): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/api/scholarships/${id}`, {
    method: 'DELETE'
  });
  return handleResponse<{ success: boolean }>(res);
}

export async function fetchScholarshipById(id: number): Promise<AdminScholarship> {
  const res = await fetch(`${API_URL}/api/scholarships/${id}`);
  return handleResponse<AdminScholarship>(res);
}

export async function fetchStudyGuideTopics(): Promise<AdminStudyGuideTopic[]> {
  const res = await fetch(`${API_URL}/api/study-guides/topics`);
  return handleResponse<AdminStudyGuideTopic[]>(res);
}

export async function createStudyGuideTopic(input: {
  name: string;
  description?: string | null;
}): Promise<AdminStudyGuideTopic> {
  const res = await fetch(`${API_URL}/api/study-guides/topics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  return handleResponse<AdminStudyGuideTopic>(res);
}

export async function updateStudyGuideTopic(
  id: number,
  input: Partial<{ name: string; description: string | null }>
): Promise<AdminStudyGuideTopic> {
  const res = await fetch(`${API_URL}/api/study-guides/topics/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  return handleResponse<AdminStudyGuideTopic>(res);
}

export async function deleteStudyGuideTopic(id: number): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/api/study-guides/topics/${id}`, { method: 'DELETE' });
  return handleResponse<{ success: boolean }>(res);
}

export async function fetchAdminStudyGuides(input?: { country?: number; topicId?: number }): Promise<AdminStudyGuide[]> {
  const url = new URL(`${API_URL}/api/study-guides`);
  if (input?.country) url.searchParams.set('country', String(input.country));
  if (input?.topicId) url.searchParams.set('topicId', String(input.topicId));
  const res = await fetch(url.toString());
  return handleResponse<AdminStudyGuide[]>(res);
}

export async function fetchStudyGuideById(id: number): Promise<AdminStudyGuide> {
  const res = await fetch(`${API_URL}/api/study-guides/${id}`);
  return handleResponse<AdminStudyGuide>(res);
}

export async function createAdminStudyGuide(input: {
  title: string;
  summary?: string | null;
  content?: string | null;
  links?: string | null;
  topicId: number;
  countryId: number;
}): Promise<AdminStudyGuide> {
  const res = await fetch(`${API_URL}/api/study-guides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  return handleResponse<AdminStudyGuide>(res);
}

export async function updateAdminStudyGuide(
  id: number,
  input: Partial<{
    title: string;
    summary: string | null;
    content: string | null;
    links: string | null;
    topicId: number;
    countryId: number;
  }>
): Promise<AdminStudyGuide> {
  const res = await fetch(`${API_URL}/api/study-guides/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  return handleResponse<AdminStudyGuide>(res);
}

export async function deleteAdminStudyGuide(id: number): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/api/study-guides/${id}`, {
    method: 'DELETE'
  });
  return handleResponse<{ success: boolean }>(res);
}

export async function fetchAdminExams(): Promise<AdminExam[]> {
  const res = await fetch(`${API_URL}/api/exams`);
  return handleResponse<AdminExam[]>(res);
}

export async function createAdminExam(input: {
  name: string;
  links?: string | null;
  duration?: string | null;
  examDate?: string | null;
  description?: string | null;
  countryId: number;
}): Promise<AdminExam> {
  const res = await fetch(`${API_URL}/api/exams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  return handleResponse<AdminExam>(res);
}

export async function updateAdminExam(
  id: number,
  input: Partial<{
    name: string;
    links: string | null;
    duration: string | null;
    examDate: string | null;
    description: string | null;
    countryId: number;
  }>
): Promise<AdminExam> {
  const res = await fetch(`${API_URL}/api/exams/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  return handleResponse<AdminExam>(res);
}

export async function deleteAdminExam(id: number): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/api/exams/${id}`, {
    method: 'DELETE'
  });
  return handleResponse<{ success: boolean }>(res);
}

export async function fetchExamById(id: number): Promise<AdminExam> {
  const res = await fetch(`${API_URL}/api/exams/${id}`);
  return handleResponse<AdminExam>(res);
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

export async function fetchMyApplications(input: { userId?: number; email?: string }): Promise<StudentApplication[]> {
  const url = new URL(`${API_URL}/api/applications/my`);
  if (input.userId) url.searchParams.set('userId', String(input.userId));
  if (input.email) url.searchParams.set('email', input.email);
  const res = await fetch(url.toString());
  return handleResponse<StudentApplication[]>(res);
}

export async function fetchStudentDashboard(userId: number): Promise<StudentDashboardData> {
  const url = new URL(`${API_URL}/api/auth/student-dashboard`);
  url.searchParams.set('userId', String(userId));
  const res = await fetch(url.toString());
  return handleResponse<StudentDashboardData>(res);
}

export async function updateStudentProfile(
  userId: number,
  input: {
    name: string;
    phone?: string | null;
    city?: string | null;
    dob?: string | null;
    gender?: string | null;
    highestQualification?: string | null;
    preferredIntake?: string | null;
    bio?: string | null;
  }
): Promise<StudentProfile> {
  const res = await fetch(`${API_URL}/api/auth/student-profile/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  return handleResponse<StudentProfile>(res);
}

export async function uploadStudentProfilePicture(input: {
  userId: number;
  fileName: string;
  fileBase64: string;
  mimeType?: string;
}): Promise<{ profilePictureUrl: string }> {
  const res = await fetch(`${API_URL}/api/auth/student-profile/${input.userId}/profile-picture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: input.fileName,
      fileBase64: input.fileBase64,
      mimeType: input.mimeType
    })
  });
  return handleResponse<{ profilePictureUrl: string }>(res);
}

export async function uploadStudentDocument(input: {
  userId: number;
  documentName: string;
  fileName: string;
  fileBase64: string;
  mimeType?: string;
}): Promise<StudentDocument> {
  const res = await fetch(`${API_URL}/api/auth/student-documents/${input.userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentName: input.documentName,
      fileName: input.fileName,
      fileBase64: input.fileBase64,
      mimeType: input.mimeType
    })
  });
  return handleResponse<StudentDocument>(res);
}

export async function deleteStudentDocument(userId: number, documentId: number): Promise<{ success: boolean }> {
  const url = new URL(`${API_URL}/api/auth/student-documents/${documentId}`);
  url.searchParams.set('userId', String(userId));
  const res = await fetch(url.toString(), { method: 'DELETE' });
  return handleResponse<{ success: boolean }>(res);
}

export async function fetchEmployeeTasks(userId: number): Promise<EmployeeTask[]> {
  const url = new URL(`${API_URL}/api/applications/employee-tasks`);
  url.searchParams.set('userId', String(userId));
  const res = await fetch(url.toString());
  return handleResponse<EmployeeTask[]>(res);
}

export async function fetchApplicationStudentDocuments(
  applicationId: number,
  employeeUserId: number
): Promise<StudentDocument[]> {
  const url = new URL(`${API_URL}/api/applications/${applicationId}/student-documents`);
  url.searchParams.set('employeeUserId', String(employeeUserId));
  const res = await fetch(url.toString());
  return handleResponse<StudentDocument[]>(res);
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
  role?: 'student' | 'uploaded' | 'admin' | 'manager' | 'employee';
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

export async function bulkCreateAdminUsers(
  users: Array<{
    name: string;
    email: string;
    phone?: string;
    city?: string;
    role?: 'student' | 'uploaded' | 'admin' | 'manager' | 'employee';
    roles?: Array<'admin' | 'manager' | 'employee'>;
    countryIds?: number[] | string;
    password?: string;
  }>
): Promise<{
  createdCount: number;
  failedCount: number;
  created: AdminListUser[];
  failed: Array<{ row: number; email?: string; reason: string }>;
}> {
  const res = await fetch(`${API_URL}/api/auth/users/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ users })
  });
  return handleResponse(res);
}

export async function updateAdminUser(
  userId: number,
  input: Partial<{
    name: string;
    email: string;
    phone?: string;
    city?: string;
    role?: 'student' | 'uploaded' | 'admin' | 'manager' | 'employee';
    roles?: Array<'admin' | 'manager' | 'employee'>;
    countryIds?: number[];
    password?: string;
  }>
): Promise<AdminListUser> {
  const res = await fetch(`${API_URL}/api/auth/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  return handleResponse<AdminListUser>(res);
}

export async function deleteAdminUser(userId: number): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/api/auth/users/${userId}`, {
    method: 'DELETE'
  });
  return handleResponse<{ success: boolean }>(res);
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
