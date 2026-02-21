import { useEffect, useState } from "react";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Logout from "@mui/icons-material/Logout";
import Settings from "@mui/icons-material/Settings";
import AccountCircle from "@mui/icons-material/AccountCircle";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";

export default function UserMenu() {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [draft, setDraft] = useState(user);
  const open = Boolean(anchorEl);
  const initials = user?.name?.trim()?.charAt(0)?.toUpperCase() || "U";

  useEffect(() => {
    setDraft(user);
  }, [user]);

  return (
    <>
      <IconButton
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          width: 44,
          height: 44,
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        <Avatar
          sx={{ width: 36, height: 36, bgcolor: "#2563eb", color: "#fff" }}
        >
          {initials}
        </Avatar>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem>
          <ListItemIcon>
            <AccountCircle fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={user?.name || "User"}
            secondary={user?.email || user?.phone}
          />
        </MenuItem>
        <MenuItem
          onClick={() => {
            navigate("/student/dashboard");
            setAnchorEl(null);
          }}
        >
          <ListItemIcon>
            <DashboardRounded fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="My Dashboard" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            setProfileOpen(true);
            setAnchorEl(null);
          }}
        >
          <ListItemIcon>
            <AccountCircle fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Update Profile" />
        </MenuItem>
        <MenuItem>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            logout();
            setAnchorEl(null);
          }}
        >
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </MenuItem>
      </Menu>

      <Dialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Update Profile</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Full name"
              value={draft?.name || ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d!, name: e.target.value }))
              }
            />
            <TextField
              label="Email"
              type="email"
              value={draft?.email || ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d!, email: e.target.value }))
              }
            />
            <TextField
              label="Phone"
              value={draft?.phone || ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d!, phone: e.target.value }))
              }
            />
            <TextField
              label="City"
              value={draft?.city || ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d!, city: e.target.value }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (draft) {
                setUser(draft);
              }
              setProfileOpen(false);
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
