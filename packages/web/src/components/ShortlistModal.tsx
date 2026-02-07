import CloseRounded from "@mui/icons-material/CloseRounded";
import EmailOutlined from "@mui/icons-material/EmailOutlined";
import LocationOnOutlined from "@mui/icons-material/LocationOnOutlined";
import PhoneAndroidOutlined from "@mui/icons-material/PhoneAndroidOutlined";
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined";
import PersonOutline from "@mui/icons-material/PersonOutline";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import InputAdornment from "@mui/material/InputAdornment";
import { useEffect, useMemo, useState } from "react";

export type FormState = {
  name: string;
  email: string;
  phone: string;
  city: string;
  course: string;
  start: string;
  consent: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmitted?: (form: FormState) => void;
  initialValues?: Partial<FormState>;
};

const initialForm: FormState = {
  name: "",
  email: "",
  phone: "",
  city: "",
  course: "",
  start: "",
  consent: true,
};

export default function ShortlistModal({ open, onClose, onSubmitted, initialValues }: Props) {
  const [form, setForm] = useState<FormState>({ ...initialForm, ...initialValues });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Refresh form defaults when dialog opens with provided initial values
  useEffect(() => {
    if (open) {
      setForm({ ...initialForm, ...initialValues });
      setErrors({});
    }
  }, [open, initialValues]);

  const handleChange = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const validate = useMemo(
    () => ({
      name: (v: string) => (!v.trim() ? "Full name is required" : ""),
      email: (v: string) =>
        !v.trim()
          ? "Email is required"
          : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
          ? ""
          : "Enter a valid email",
      phone: (v: string) =>
        !v.trim()
          ? "Phone is required"
          : /^\+?\d{6,15}$/.test(v.replace(/\s+/g, ""))
          ? ""
          : "Enter a valid phone number",
      city: (v: string) => (!v.trim() ? "City is required" : ""),
      course: (v: string) => (!v.trim() ? "Course is required" : ""),
      start: (v: string) => (!v.trim() ? "Start date/plan is required" : ""),
      consent: (v: boolean) => (v ? "" : "Consent is required"),
    }),
    []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    (Object.keys(form) as (keyof typeof form)[]).forEach((key) => {
      // @ts-expect-error generic validator map
      const err = validate[key](form[key]);
      if (err) nextErrors[key] = err;
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      fetch(`${import.meta.env.VITE_API_URL || "http://localhost:6942"}/api/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          city: form.city,
          course: form.course,
        }),
      })
        .then(async (r) => {
          if (!r.ok) throw new Error(await r.text());
          return r.json();
        })
        .then(() => {
          onSubmitted?.(form);
          setForm(initialForm);
          onClose();
        })
        .catch((err) => {
          setErrors({ submit: err.message || "Something went wrong" });
        });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogContent sx={{ p: { xs: 2, md: 3 } }}>
        <Box display="flex" justifyContent="flex-end">
          <IconButton onClick={onClose} size="small">
            <CloseRounded />
          </IconButton>
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1.5fr" },
            gap: 3,
          }}
        >
          <Box>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                background:
                  "linear-gradient(135deg, rgba(255,153,102,0.12), rgba(255,214,102,0.12)), #fff8f0",
                height: "100%",
              }}
            >
              <Typography fontWeight={800} fontSize={20} color="#f97316">
                Meet Our Study Abroad Experts
              </Typography>
              <Typography color="text.secondary" fontSize={14} sx={{ mb: 1 }}>
                Get Exclusive Discounts on Application & VISA Fees
              </Typography>
              <Box
                sx={{
                  height: 140,
                  borderRadius: 1.5,
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.5), rgba(255,255,255,0.1)), url('https://images.unsplash.com/photo-1588075592446-265fd1e6e76e?auto=format&fit=crop&w=800&q=80') center/cover",
                }}
              />
              <Typography fontWeight={700} mt={2} mb={1} fontSize={15}>
                Apply to 1800+ Study Abroad Universities
              </Typography>
              <Typography color="text.secondary" fontSize={13} mb={1}>
                Get up to <strong>80% discount</strong> on Visa Application fees
              </Typography>
              <Box
                sx={{
                  border: "1px solid #f3f4f6",
                  borderRadius: 1,
                  overflow: "hidden",
                  mb: 1.5,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", p: 1, borderBottom: "1px solid #f3f4f6" }}>
                  <img
                    src="https://flagcdn.com/32x24/ca.png"
                    alt="Canada"
                    width={32}
                    height={24}
                    style={{ borderRadius: 4, marginRight: 8 }}
                  />
                  <Typography fontWeight={600} fontSize={13}>
                    University of Toronto, Toronto
                  </Typography>
                  <Typography ml="auto" fontWeight={700} color="#f97316" fontSize={12}>
                    Save
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", p: 1 }}>
                  <img
                    src="https://flagcdn.com/32x24/us.png"
                    alt="USA"
                    width={32}
                    height={24}
                    style={{ borderRadius: 4, marginRight: 8 }}
                  />
                  <Typography fontWeight={600} fontSize={13}>
                    Arizona State University, Tempe
                  </Typography>
                  <Typography ml="auto" fontWeight={700} color="#f97316" fontSize={12}>
                    Save
                  </Typography>
                </Box>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography fontWeight={700} color="#2563eb" fontSize={13}>
                  Pay 0 Visa Fees
                </Typography>
                <Typography fontWeight={700} color="#f97316" fontSize={13}>
                  Application Fees
                </Typography>
              </Stack>
            </Box>
          </Box>

          <Box>
            <Box component="form" onSubmit={handleSubmit}>
              <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                <Box
                  sx={{
                    width: 54,
                    height: 54,
                    borderRadius: "50%",
                    border: "1px solid #f97316",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <MenuBookOutlined sx={{ color: "#f97316" }} />
                </Box>
                <Box>
                  <Typography fontWeight={800} fontSize={22} color="#f97316">
                    Register Now To Shortlist
                  </Typography>
                  <Typography color="text.secondary" fontSize={14}>
                    Get details and latest updates
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  gap: 1.5,
                }}
              >
                <Box>
                  <TextField
                    required
                    fullWidth
                    label="Full Name"
                    size="small"
                    value={form.name}
                    onChange={handleChange("name")}
                    error={!!errors.name}
                    helperText={errors.name}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutline fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
                <Box>
                  <TextField
                    required
                    fullWidth
                    label="Email Address"
                    size="small"
                    value={form.email}
                    onChange={handleChange("email")}
                    error={!!errors.email}
                    helperText={errors.email}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailOutlined fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
                <Box>
                  <TextField
                    required
                    fullWidth
                    label="Mobile Number"
                    size="small"
                    value={form.phone}
                    onChange={handleChange("phone")}
                    error={!!errors.phone}
                    helperText={errors.phone}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography fontWeight={600}>+91</Typography>
                            <PhoneAndroidOutlined fontSize="small" />
                          </Stack>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
                <Box>
                  <TextField
                    required
                    fullWidth
                    label="City You Live In"
                    size="small"
                    value={form.city}
                    onChange={handleChange("city")}
                    error={!!errors.city}
                    helperText={errors.city}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationOnOutlined fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
                <Box>
                  <TextField
                    required
                    fullWidth
                    label="Course Interested In"
                    size="small"
                    value={form.course}
                    onChange={handleChange("course")}
                    error={!!errors.course}
                    helperText={errors.course}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <MenuBookOutlined fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
                <Box>
                  <TextField
                    required
                    fullWidth
                    label="When do you plan to start your studies?"
                    size="small"
                    value={form.start}
                    onChange={handleChange("start")}
                    error={!!errors.start}
                    helperText={errors.start}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarMonthOutlined fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
              </Box>

              <Stack direction="row" alignItems="flex-start" spacing={1.2} mt={2}>
                <Checkbox
                  checked={form.consent}
                  onChange={(e) => setForm((p) => ({ ...p, consent: e.target.checked }))}
                  sx={{ color: "#f97316", "&.Mui-checked": { color: "#f97316" }, mt: -0.5 }}
                  inputProps={{ required: true }}
                />
                <Typography fontSize={13} sx={{ lineHeight: 1.5 }}>
                  By submitting this form, you accept and agree to our{" "}
                  <a href="#" style={{ color: "#2563eb", fontWeight: 700 }}>
                    Terms of Use
                  </a>{" "}
                  and{" "}
                  <a href="#" style={{ color: "#2563eb", fontWeight: 700 }}>
                    Privacy Policy
                  </a>
                  .
                </Typography>
              </Stack>

              <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2} gap={2}>
                <Typography fontWeight={700} color="#f97316">
                  Already Registered? Click Here To Login.
                </Typography>
                <Button type="submit" variant="contained" sx={{ background: "#f97316", px: 3, py: 1 }}>
                  Submit
                </Button>
              </Stack>
              {errors.submit ? (
                <Typography color="error" fontSize={13} mt={1}>
                  {errors.submit}
                </Typography>
              ) : null}
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
