import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import type { Program } from "../../lib/api";
import Stack from "@mui/material/Stack";
type Props = {
  open: boolean;
  program: Program | null;
  applied?: boolean;
  onClose: () => void;
  onApply?: (program: Program) => void;
};

export default function ProgramDetailModal({
  open,
  program,
  applied = false,
  onClose,
  onApply,
}: Props) {
  if (!program) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{program.programName}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          {program.universityName}
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          sx={{ mb: 2 }}
        >
          <>
            {program.levelOfStudy && (
              <Chip label={program.levelOfStudy} color="primary" size="small" />
            )}
            {program.languageOfStudy && (
              <Chip label={program.languageOfStudy} size="small" />
            )}
            {program.country?.name && (
              <Chip label={program.country.name} size="small" />
            )}
            {program.location && <Chip label={program.location} size="small" />}
          </>
        </Stack>
        {program.levelOfStudy && (
          <Typography gutterBottom>
            <strong>Level:</strong> {program.levelOfStudy}
          </Typography>
        )}
        {program.location && (
          <Typography gutterBottom>
            <strong>Location:</strong> {program.location}
          </Typography>
        )}
        {program.tuitionFeePerYear && (
          <Typography gutterBottom>
            <strong>Tuition per year:</strong> {program.tuitionFeePerYear}
          </Typography>
        )}
        {program.applicationFee && (
          <Typography gutterBottom>
            <strong>Application fee:</strong> {program.applicationFee}
          </Typography>
        )}
        {program.intakes && (
          <Typography gutterBottom sx={{ mt: 1 }}>
            <strong>Intakes:</strong> {program.intakes}
          </Typography>
        )}
        {program.deadlines && (
          <Typography gutterBottom>
            <strong>Deadlines:</strong> {program.deadlines}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          disabled={applied}
          onClick={() => {
            if (applied) return;
            onApply?.(program);
            onClose();
          }}
        >
          {applied ? 'Applied' : 'Apply'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
