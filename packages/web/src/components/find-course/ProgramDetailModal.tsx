import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import type { Program } from "../../lib/api";

type Props = {
  open: boolean;
  program: Program | null;
  onClose: () => void;
  onApply?: (program: Program) => void;
};

export default function ProgramDetailModal({ open, program, onClose, onApply }: Props) {
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
          gutterBottom
          sx={{ mb: 2 }}
        >
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
        </Stack>
        {program.intakes && (
          <Typography gutterBottom>
            <strong>Intakes:</strong> {program.intakes}
          </Typography>
        )}
        {program.deadlines && (
          <Typography gutterBottom>
            <strong>Deadlines:</strong> {program.deadlines}
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
        {program.description && (
          <Typography gutterBottom sx={{ mt: 1 }}>
            {program.description}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          onClick={() => {
            onApply?.(program);
            onClose();
          }}
        >
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}
