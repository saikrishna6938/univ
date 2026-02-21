import DashboardRounded from "@mui/icons-material/DashboardRounded";
import MailOutlineRounded from "@mui/icons-material/MailOutlineRounded";
import UploadFileRounded from "@mui/icons-material/UploadFileRounded";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Link,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../layouts/AuthContext";
import {
  deleteStudentDocument,
  fetchStudentDashboard,
  type Program,
  type StudentApplication,
  type StudentDashboardData,
  type StudentDocument,
  updateStudentProfile,
  uploadStudentDocument,
  uploadStudentProfilePicture,
} from "../lib/api";

const LIKED_PROGRAMS_KEY_PREFIX = "liked_programs";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function toAbsoluteFileUrl(url?: string | null) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_URL}${url}`;
}

function readAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function PanelCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      sx={{
        borderRadius: 1,
        border: "1px solid #dbe2ea",
        boxShadow: "0 6px 16px rgba(15,23,42,0.04)",
      }}
    >
      <CardContent>
        <Typography variant="h6" fontWeight={800}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {subtitle}
          </Typography>
        ) : null}
        {children}
      </CardContent>
    </Card>
  );
}

export default function StudentDashboard() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState(0);
  const [applications, setApplications] = useState<StudentApplication[]>([]);
  const [likedPrograms, setLikedPrograms] = useState<Program[]>([]);
  const [relatedPrograms, setRelatedPrograms] = useState<Program[]>([]);
  const [interestedStudents, setInterestedStudents] = useState<
    StudentDashboardData["interestedStudentsLast6Months"]
  >([]);
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [docName, setDocName] = useState("");
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    city: "",
    dob: "",
    gender: "",
    highestQualification: "",
    preferredIntake: "",
    bio: "",
    profilePictureUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const likeStorageKey = useMemo(() => {
    if (!user?.id) return `${LIKED_PROGRAMS_KEY_PREFIX}:guest`;
    return `${LIKED_PROGRAMS_KEY_PREFIX}:${user.id}`;
  }, [user?.id]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(likeStorageKey);
      if (!raw) {
        setLikedPrograms([]);
        return;
      }
      const parsed = JSON.parse(raw) as Program[];
      setLikedPrograms(Array.isArray(parsed) ? parsed : []);
    } catch {
      setLikedPrograms([]);
    }
  }, [likeStorageKey]);

  useEffect(() => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, {
        replace: true,
      });
    }
  }, [user, navigate, location.pathname]);

  useEffect(() => {
    let mounted = true;

    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchStudentDashboard(user.id)
      .then((data) => {
        if (!mounted) return;
        setApplications(data.applications || []);
        setRelatedPrograms(
          Array.isArray(data.relatedPrograms) ? data.relatedPrograms : [],
        );
        setInterestedStudents(
          Array.isArray(data.interestedStudentsLast6Months)
            ? data.interestedStudentsLast6Months
            : [],
        );
        setDocuments(Array.isArray(data.documents) ? data.documents : []);
        setProfileForm({
          name: data.profile?.name || "",
          phone: data.profile?.phone || "",
          city: data.profile?.city || "",
          dob: data.profile?.dob ? String(data.profile.dob).slice(0, 10) : "",
          gender: data.profile?.gender || "",
          highestQualification: data.profile?.highestQualification || "",
          preferredIntake: data.profile?.preferredIntake || "",
          bio: data.profile?.bio || "",
          profilePictureUrl: data.profile?.profilePictureUrl || "",
        });
        setError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard",
        );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const onSaveProfile = async () => {
    if (!user?.id) return;
    setSavingProfile(true);
    try {
      const saved = await updateStudentProfile(user.id, {
        name: profileForm.name,
        phone: profileForm.phone || null,
        city: profileForm.city || null,
        dob: profileForm.dob || null,
        gender: profileForm.gender || null,
        highestQualification: profileForm.highestQualification || null,
        preferredIntake: profileForm.preferredIntake || null,
        bio: profileForm.bio || null,
      });
      setProfileForm((prev) => ({
        ...prev,
        name: saved.name || "",
        phone: saved.phone || "",
        city: saved.city || "",
        dob: saved.dob ? String(saved.dob).slice(0, 10) : "",
        gender: saved.gender || "",
        highestQualification: saved.highestQualification || "",
        preferredIntake: saved.preferredIntake || "",
        bio: saved.bio || "",
      }));
      setUser({
        id: user.id,
        name: saved.name,
        email: user.email,
        phone: saved.phone || undefined,
        city: saved.city || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const onUploadPhoto = async (file?: File) => {
    if (!user?.id || !file) return;
    setUploadingPhoto(true);
    try {
      const base64 = await readAsBase64(file);
      const uploaded = await uploadStudentProfilePicture({
        userId: user.id,
        fileName: file.name,
        fileBase64: base64,
        mimeType: file.type,
      });
      setProfileForm((prev) => ({
        ...prev,
        profilePictureUrl: uploaded.profilePictureUrl,
      }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to upload profile picture",
      );
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const onUploadDocument = async (file?: File) => {
    if (!user?.id || !file) return;
    setUploadingDoc(true);
    try {
      const base64 = await readAsBase64(file);
      const created = await uploadStudentDocument({
        userId: user.id,
        documentName: docName.trim() || file.name,
        fileName: file.name,
        fileBase64: base64,
        mimeType: file.type,
      });
      setDocuments((prev) => [created, ...prev]);
      setDocName("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to upload document",
      );
    } finally {
      setUploadingDoc(false);
      if (documentInputRef.current) documentInputRef.current.value = "";
    }
  };

  const onDeleteDocument = async (documentId: number) => {
    if (!user?.id) return;
    setDeletingDocId(documentId);
    try {
      await deleteStudentDocument(user.id, documentId);
      setDocuments((prev) => prev.filter((item) => item.id !== documentId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete document",
      );
    } finally {
      setDeletingDocId(null);
    }
  };

  const applicationStatusCounts = useMemo(() => {
    const counts = {
      submitted: 0,
      reviewing: 0,
      accepted: 0,
      rejected: 0,
    };
    applications.forEach((item) => {
      const key = item.status as keyof typeof counts;
      if (key in counts) counts[key] += 1;
    });
    return counts;
  }, [applications]);

  const profileCompletion = useMemo(() => {
    const checks = [
      Boolean(profileForm.name?.trim()),
      Boolean(profileForm.phone?.trim()),
      Boolean(profileForm.city?.trim()),
      Boolean(profileForm.dob?.trim()),
      Boolean(profileForm.gender?.trim()),
      Boolean(profileForm.highestQualification?.trim()),
      Boolean(profileForm.preferredIntake?.trim()),
      Boolean(profileForm.bio?.trim()),
      Boolean(profileForm.profilePictureUrl?.trim()),
    ];
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }, [profileForm]);

  const recentApplications = applications.slice(0, 5);
  const recentLikedPrograms = likedPrograms.slice(0, 5);
  const recentDocuments = documents.slice(0, 4);

  if (!user) {
    return null;
  }

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      {error ? (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Card
        sx={{
          borderRadius: 1,
          overflow: "hidden",
          border: "1px solid #dbe2ea",
        }}
      >
        <Box
          sx={{
            height: { xs: 140, md: 220 },
            background:
              "linear-gradient(120deg, #1f2937 0%, #334155 55%, #475569 100%)",
          }}
        />
        <Box
          sx={{
            px: { xs: 2, md: 4 },
            pb: 2,
            mt: { xs: -5, md: -6 },
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "flex-start", md: "center" },
            justifyContent: "space-between",
            gap: 2,
            position: "relative",
            zIndex: 1,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              src={toAbsoluteFileUrl(profileForm.profilePictureUrl)}
              sx={{
                width: { xs: 84, md: 104 },
                height: { xs: 84, md: 104 },
                border: "4px solid #fff",
              }}
            >
              {profileForm.name?.trim()?.charAt(0)?.toUpperCase() || "S"}
            </Avatar>
            <Box>
              <Typography
                variant="h5"
                fontWeight={800}
                sx={{
                  color: "#ffffff",
                  textShadow: "0 1px 2px rgba(0,0,0,0.35)",
                }}
              >
                {profileForm.name || "Student"}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "#0077ffff",
                  textShadow: "0 1px 1px rgba(0,0,0,0.28)",
                }}
              >
                {profileForm.city || "No city selected"}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Chip
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: "#94a3b8",
                    color: "#334155",
                    bgcolor: "#f8fafc",
                  }}
                  label={`${applications.length} Applied`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: "#94a3b8",
                    color: "#334155",
                    bgcolor: "#f8fafc",
                  }}
                  label={`${likedPrograms.length} Liked`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: "#94a3b8",
                    color: "#334155",
                    bgcolor: "#f8fafc",
                  }}
                  label={`${documents.length} Docs`}
                />
              </Stack>
            </Box>
          </Stack>

          <Button
            variant="contained"
            startIcon={<UploadFileRounded />}
            onClick={() => photoInputRef.current?.click()}
            disabled={uploadingPhoto}
          >
            {uploadingPhoto ? "Uploading..." : "Change Photo"}
          </Button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onUploadPhoto(e.target.files?.[0])}
          />
        </Box>
      </Card>

      <Card sx={{ borderRadius: 1, border: "1px solid #dbe2ea" }}>
        <Box sx={{ px: 1, pt: 1 }}>
          <Tabs
            value={tab}
            onChange={(_e, value) => setTab(value)}
            variant="scrollable"
            scrollButtons={false}
            sx={{
              "& .MuiTabs-indicator": { display: "none" },
              "& .MuiTab-root": {
                borderRadius: 1,
                minHeight: 38,
                textTransform: "none",
                fontWeight: 700,
                color: "#475569",
              },
              "& .Mui-selected": {
                background: "#e2e8f0",
                color: "#0f172a !important",
              },
            }}
          >
            <Tab label="Overview" />
            <Tab label="Profile" />
            <Tab label="Documents" />
            <Tab label="Discover" />
            <Tab label="Support" />
          </Tabs>
        </Box>
      </Card>

      {tab === 0 ? (
        <Box sx={{ display: "grid", gap: 2 }}>
          <Box
            sx={{
              display: "grid",
              gap: 1.2,
              gridTemplateColumns: {
                xs: "1fr 1fr",
                md: "repeat(4, minmax(0, 1fr))",
              },
            }}
          >
            {[
              { label: "Applications", value: applications.length, color: "#1d4ed8" },
              { label: "Liked Programs", value: likedPrograms.length, color: "#be185d" },
              { label: "Documents", value: documents.length, color: "#0f766e" },
              { label: "Profile Complete", value: `${profileCompletion}%`, color: "#7c3aed" },
            ].map((card) => (
              <Card
                key={card.label}
                sx={{
                  borderRadius: 1,
                  border: "1px solid #dbe2ea",
                  boxShadow: "0 4px 12px rgba(15,23,42,0.04)",
                }}
              >
                <CardContent sx={{ pb: "12px !important" }}>
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700 }}>
                    {card.label}
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 800, color: card.color }}>
                    {card.value}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
            }}
          >
            <PanelCard
              title="Recent Applications"
              subtitle="Track latest application progress and status."
            >
              <Stack spacing={1} sx={{ mt: 1 }}>
                {loading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <Skeleton key={`app-skeleton-${idx}`} height={34} />
                  ))
                ) : recentApplications.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No applied programs yet.
                  </Typography>
                ) : (
                  recentApplications.map((item) => (
                    <Box
                      key={item.id}
                      sx={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 1,
                        p: 1.2,
                        bgcolor: "#f8fafc",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          {item.programName || "-"}{" "}
                          {item.universityName ? `• ${item.universityName}` : ""}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.countryName || "-"} •{" "}
                          {new Date(item.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={item.status}
                        sx={{
                          textTransform: "capitalize",
                          borderRadius: 1,
                          bgcolor:
                            item.status === "accepted"
                              ? "#dcfce7"
                              : item.status === "rejected"
                                ? "#fee2e2"
                                : item.status === "reviewing"
                                  ? "#fef3c7"
                                  : "#e2e8f0",
                          color:
                            item.status === "accepted"
                              ? "#166534"
                              : item.status === "rejected"
                                ? "#991b1b"
                                : item.status === "reviewing"
                                  ? "#92400e"
                                  : "#334155",
                        }}
                      />
                    </Box>
                  ))
                )}
              </Stack>
            </PanelCard>

            <PanelCard
              title="Application Status Summary"
              subtitle="Quick breakdown of your current pipeline."
            >
              <Stack spacing={1.2} sx={{ mt: 1 }}>
                {[
                  { key: "submitted", label: "Submitted", value: applicationStatusCounts.submitted },
                  { key: "reviewing", label: "Reviewing", value: applicationStatusCounts.reviewing },
                  { key: "accepted", label: "Accepted", value: applicationStatusCounts.accepted },
                  { key: "rejected", label: "Rejected", value: applicationStatusCounts.rejected },
                ].map((row) => {
                  const total = Math.max(applications.length, 1);
                  const width = `${Math.round((row.value / total) * 100)}%`;
                  return (
                    <Box key={row.key}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 0.5 }}
                      >
                        <Typography variant="body2" fontWeight={700}>
                          {row.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.value}
                        </Typography>
                      </Stack>
                      <Box sx={{ height: 8, borderRadius: 1, bgcolor: "#e2e8f0", overflow: "hidden" }}>
                        <Box sx={{ width, height: "100%", bgcolor: "#475569" }} />
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            </PanelCard>
          </Box>

          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
            }}
          >
            <PanelCard title="Programs You Liked" subtitle="Saved choices you can apply to next.">
              <Stack spacing={1} sx={{ mt: 1 }}>
                {recentLikedPrograms.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No liked programs yet.
                  </Typography>
                ) : (
                  recentLikedPrograms.map((item) => (
                    <Box
                      key={String((item as any).id ?? item._id)}
                      sx={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 1,
                        p: 1.2,
                        bgcolor: "#f8fafc",
                      }}
                    >
                      <Typography variant="body2" fontWeight={700}>
                        {item.programName}{" "}
                        {item.universityName ? `• ${item.universityName}` : ""}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.country?.name || "-"}{" "}
                        {item.location ? `• ${item.location}` : ""}
                      </Typography>
                    </Box>
                  ))
                )}
              </Stack>
            </PanelCard>

            <PanelCard title="Recent Documents" subtitle="Latest uploaded files for your application.">
              <Stack spacing={1} sx={{ mt: 1 }}>
                {recentDocuments.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No documents uploaded yet.
                  </Typography>
                ) : (
                  recentDocuments.map((doc) => (
                    <Box
                      key={doc.id}
                      sx={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 1,
                        p: 1.2,
                        bgcolor: "#f8fafc",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          {doc.documentName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Button
                        component="a"
                        href={toAbsoluteFileUrl(doc.fileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        size="small"
                        variant="outlined"
                        sx={{ borderRadius: 1 }}
                      >
                        Open
                      </Button>
                    </Box>
                  ))
                )}
              </Stack>
            </PanelCard>
          </Box>
        </Box>
      ) : null}

      {tab === 1 ? (
        <PanelCard
          title="Profile Information"
          subtitle="Keep your latest details updated for better guidance."
        >
          <Box
            sx={{
              display: "grid",
              gap: 1.2,
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            }}
          >
            <TextField
              size="small"
              label="Name"
              value={profileForm.name}
              onChange={(e) =>
                setProfileForm((p) => ({ ...p, name: e.target.value }))
              }
            />
            <TextField
              size="small"
              label="Phone"
              value={profileForm.phone}
              onChange={(e) =>
                setProfileForm((p) => ({ ...p, phone: e.target.value }))
              }
            />
            <TextField
              size="small"
              label="City"
              value={profileForm.city}
              onChange={(e) =>
                setProfileForm((p) => ({ ...p, city: e.target.value }))
              }
            />
            <TextField
              size="small"
              label="DOB"
              type="date"
              value={profileForm.dob}
              onChange={(e) =>
                setProfileForm((p) => ({ ...p, dob: e.target.value }))
              }
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              label="Gender"
              value={profileForm.gender}
              onChange={(e) =>
                setProfileForm((p) => ({ ...p, gender: e.target.value }))
              }
            />
            <TextField
              size="small"
              label="Highest Qualification"
              value={profileForm.highestQualification}
              onChange={(e) =>
                setProfileForm((p) => ({
                  ...p,
                  highestQualification: e.target.value,
                }))
              }
            />
            <TextField
              size="small"
              label="Preferred Intake"
              value={profileForm.preferredIntake}
              onChange={(e) =>
                setProfileForm((p) => ({
                  ...p,
                  preferredIntake: e.target.value,
                }))
              }
            />
          </Box>
          <TextField
            size="small"
            multiline
            minRows={2}
            label="About You"
            value={profileForm.bio}
            onChange={(e) =>
              setProfileForm((p) => ({ ...p, bio: e.target.value }))
            }
            sx={{ mt: 1.2 }}
            fullWidth
          />
          <Button
            sx={{ mt: 1.5 }}
            variant="contained"
            onClick={onSaveProfile}
            disabled={savingProfile}
          >
            {savingProfile ? "Saving..." : "Save Profile"}
          </Button>
        </PanelCard>
      ) : null}

      {tab === 2 ? (
        <PanelCard
          title="My Documents"
          subtitle="Upload and manage your student documents."
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              size="small"
              label="Document Name"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              fullWidth
            />
            <Button
              variant="contained"
              startIcon={<UploadFileRounded />}
              onClick={() => documentInputRef.current?.click()}
              disabled={uploadingDoc}
            >
              {uploadingDoc ? "Uploading..." : "Upload"}
            </Button>
            <input
              ref={documentInputRef}
              type="file"
              hidden
              onChange={(e) => onUploadDocument(e.target.files?.[0])}
            />
          </Stack>

          <Stack spacing={1} sx={{ mt: 1.5 }}>
            {documents.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No documents uploaded yet.
              </Typography>
            ) : (
              documents.map((doc) => (
                <Box
                  key={doc.id}
                  sx={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 1,
                    p: 1.2,
                    bgcolor: "#f8fafc",
                  }}
                >
                  <Typography variant="body2" fontWeight={700}>
                    {doc.documentName}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 0.8 }}>
                    <Link
                      href={toAbsoluteFileUrl(doc.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      underline="hover"
                    >
                      View
                    </Link>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => onDeleteDocument(doc.id)}
                      disabled={deletingDocId === doc.id}
                    >
                      {deletingDocId === doc.id ? "Deleting..." : "Delete"}
                    </Button>
                  </Stack>
                </Box>
              ))
            )}
          </Stack>
        </PanelCard>
      ) : null}

      {tab === 3 ? (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          }}
        >
          <PanelCard title="Students Interested In Last 6 Months">
            <Stack spacing={1}>
              {interestedStudents.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No records found.
                </Typography>
              ) : (
                interestedStudents.map((student) => (
                  <Box
                    key={student.id}
                    sx={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 1,
                      p: 1.2,
                      bgcolor: "#f8fafc",
                    }}
                  >
                    <Typography variant="body2" fontWeight={700}>
                      {student.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {student.city || "Unknown city"} •{" "}
                      {new Date(student.interestUpdatedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                ))
              )}
            </Stack>
          </PanelCard>

          <PanelCard title="Related Programs By Your Country">
            <Stack spacing={1}>
              {relatedPrograms.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No related programs found yet. Apply to a program first to
                  personalize this section.
                </Typography>
              ) : (
                relatedPrograms.map((program) => (
                  <Box
                    key={String((program as any).id ?? program._id)}
                    sx={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 1,
                      p: 1.2,
                      bgcolor: "#f8fafc",
                    }}
                  >
                    <Typography variant="body2" fontWeight={700}>
                      {program.programName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {program.universityName} • {program.country?.name || "-"}
                    </Typography>
                  </Box>
                ))
              )}
            </Stack>
          </PanelCard>
        </Box>
      ) : null}

      {tab === 4 ? (
        <PanelCard
          title="Need Help?"
          subtitle="Contact support for application guidance and document help."
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <MailOutlineRounded sx={{ color: "#334155" }} />
            <Link
              href="mailto:helpdesk@gradwalk.com"
              underline="hover"
              sx={{ fontWeight: 700 }}
            >
              helpdesk@gradwalk.com
            </Link>
          </Stack>
          <Box sx={{ mt: 1.5 }}>
            <Button
              variant="outlined"
              startIcon={<DashboardRounded />}
              onClick={() => setTab(0)}
            >
              Back To Overview
            </Button>
          </Box>
        </PanelCard>
      ) : null}

      {loading && tab !== 0 ? (
        <Card sx={{ borderRadius: 1, border: "1px solid #dbe2ea" }}>
          <CardContent>
            <Skeleton height={30} width={220} />
            <Skeleton height={22} width="100%" />
            <Skeleton height={22} width="80%" />
          </CardContent>
        </Card>
      ) : null}
    </Box>
  );
}
