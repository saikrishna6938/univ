import { Box, Table, TableBody, TableContainer, TableHead, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';

type AdminDataTableProps = {
  headerRow: ReactNode;
  bodyRows: ReactNode;
  tableMinWidth?: number;
  tableLayout?: 'auto' | 'fixed';
  maxBodyHeight?: unknown;
  minBodyHeight?: unknown;
  containerSx?: SxProps<Theme>;
  headerSx?: SxProps<Theme>;
  bodySx?: SxProps<Theme>;
};

export default function AdminDataTable({
  headerRow,
  bodyRows,
  tableMinWidth = 960,
  tableLayout = 'fixed',
  maxBodyHeight = 640,
  minBodyHeight,
  containerSx,
  headerSx,
  bodySx
}: AdminDataTableProps) {
  return (
    <TableContainer
      sx={{
        overflowX: 'auto',
        ...containerSx
      }}
    >
      <Box sx={{ minWidth: tableMinWidth }}>
        <Table size="small" sx={{ tableLayout }}>
          <TableHead
            sx={{
              backgroundColor: '#f8fafc',
              '& .MuiTableCell-root': { fontWeight: 700 },
              ...headerSx
            }}
          >
            {headerRow}
          </TableHead>
        </Table>

        <Box
          sx={{
            overflowY: 'auto',
            maxHeight: maxBodyHeight as number | string | undefined,
            minHeight: minBodyHeight as number | string | undefined,
            ...bodySx
          }}
        >
          <Table size="small" sx={{ tableLayout }}>
            <TableBody>{bodyRows}</TableBody>
          </Table>
        </Box>
      </Box>
    </TableContainer>
  );
}
