import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import { useState } from "react";
import { useCountry } from "./CountryContext";

function getId(country: { id?: string | number; _id?: string }) {
  return (country.id ?? country._id)?.toString();
}

function Flag({ isoCode, size = 28 }: { isoCode?: string; size?: number }) {
  if (!isoCode) {
    return <span style={{ fontSize: size }}>🏳️</span>;
  }
  const code = isoCode.slice(0, 2).toLowerCase();
  // flagcdn supports discrete sizes; pick the closest valid height.
  const allowedHeights = [12, 15, 18, 21, 24, 27, 30, 36, 42, 45, 48, 54, 60];
  const height = allowedHeights.reduce(
    (prev, curr) =>
      Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev,
    allowedHeights[0],
  );
  const width = Math.round((height / 3) * 4); // maintain 4:3 ratio
  return (
    <img
      src={`https://flagcdn.com/${width}x${height}/${code}.png`}
      alt={isoCode}
      width={width}
      height={height}
      style={{
        borderRadius: "50%",
        objectFit: "cover",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
      }}
    />
  );
}

export default function CountrySelector() {
  const {
    countries,
    selectedCountry,
    selectedCountryId,
    setSelectedCountryId,
  } = useCountry();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleSelect = (id?: string) => {
    setSelectedCountryId(id);
    setAnchorEl(null);
  };

  return (
    <>
      <Button
        color="inherit"
        className="country-selector"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        endIcon={<ExpandMoreRounded />}
        size="small"
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Flag isoCode={selectedCountry?.isoCode} size={20} />
          <Typography variant="body2" color="inherit" noWrap>
            {selectedCountry?.name || "Select Country"}
          </Typography>
        </Stack>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        keepMounted
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        MenuListProps={{ disablePadding: true }}
        PaperProps={{
          sx: {
            p: 2,
            minWidth: 680,
            maxWidth: 760,
            boxShadow: 4,
            borderRadius: 0,
          },
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          px={1}
          pb={1}
        >
          <Typography variant="h6" fontWeight={700}>
            Select Your Study Preference
          </Typography>
          <IconButton size="small" onClick={() => setAnchorEl(null)}>
            <CloseRounded fontSize="small" />
          </IconButton>
        </Box>
        <Divider />
        <Box
          px={1}
          py={2}
          display="grid"
          gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }}
          gap={1}
        >
          {countries.map((c) => (
            <MenuItem
              key={getId(c) || c.name}
              onClick={() => handleSelect(getId(c))}
              selected={getId(c) === selectedCountryId}
              sx={{
                borderRadius: 2,
                py: 1,
                px: 1.5,
                display: "flex",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <Flag isoCode={c.isoCode} />
              <Typography variant="body1">{c.name}</Typography>
            </MenuItem>
          ))}
        </Box>
      </Menu>
    </>
  );
}
