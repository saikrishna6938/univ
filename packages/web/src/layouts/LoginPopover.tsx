import { useState } from "react";
import Popover from "@mui/material/Popover";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import { useAuth } from "./AuthContext";

type Step = "request" | "verify";

export default function LoginPopover() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();

  const open = Boolean(anchorEl);

  const reset = () => {
    setStep("request");
    setEmail("");
    setPhone("");
    setOtp("");
    setMessage("");
    setError("");
  };

  const handleSendOtp = () => {
    setError("");
    setMessage("");
    if (!email.trim() && !phone.trim()) {
      setError("Enter email or phone number");
      return;
    }
    setLoading(true);
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:6942"}/api/auth/request-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() || undefined, phone: phone.trim() || undefined }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then(() => {
        setMessage("OTP sent. Please check your email/phone.");
        setStep("verify");
      })
      .catch((err) => setError(err.message || "Failed to send OTP"))
      .finally(() => setLoading(false));
  };

  const handleVerify = () => {
    setError("");
    setMessage("");
    if (!otp.trim()) {
      setError("Enter the OTP");
      return;
    }
    setLoading(true);
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:6942"}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() || undefined, phone: phone.trim() || undefined, code: otp.trim() }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((user) => {
        setUser({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
        });
        setMessage("Logged in successfully.");
        setTimeout(() => {
          setAnchorEl(null);
          reset();
        }, 400);
      })
      .catch((err) => setError(err.message || "Invalid OTP"))
      .finally(() => setLoading(false));
  };

  return (
    <>
      <Button
        variant="outlined"
        color="inherit"
        size="small"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{ height: 44, borderColor: "rgba(255,255,255,0.2)", color: "#e2e8f0" }}
      >
        Login
      </Button>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => {
          setAnchorEl(null);
          reset();
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { p: 2, width: 360, borderRadius: 2 } }}
      >
        <Stack spacing={1.25}>
          <Typography variant="h6" fontWeight={800}>
            {step === "request" ? "Login with OTP" : "Enter OTP"}
          </Typography>
          {step === "request" ? (
            <Typography variant="body2" color="text.secondary">
              Login using your email or phone number to receive a one-time passcode.
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Enter the one-time passcode we sent to your email or phone.
            </Typography>
          )}
          <Divider />
          {step === "request" ? (
            <>
              <TextField
                size="small"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
              />
              <Typography textAlign="center" variant="body2" color="text.secondary">
                — OR —
              </Typography>
              <TextField
                size="small"
                label="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                fullWidth
                helperText="Include country code if outside default"
              />
              <Button variant="contained" onClick={handleSendOtp} disabled={loading}>
                {loading ? "Sending..." : "Send OTP"}
              </Button>
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                We sent an OTP to {email || phone}. Enter it below.
              </Typography>
              <TextField
                size="small"
                label="OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                fullWidth
                inputProps={{ maxLength: 6 }}
              />
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={() => setStep("request")} disabled={loading}>
                  Back
                </Button>
                <Button variant="contained" onClick={handleVerify} disabled={loading}>
                  {loading ? "Verifying..." : "Verify & Login"}
                </Button>
              </Stack>
            </>
          )}
          {message && (
            <Typography variant="body2" color="success.main">
              {message}
            </Typography>
          )}
          {error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}
        </Stack>
      </Popover>
    </>
  );
}
