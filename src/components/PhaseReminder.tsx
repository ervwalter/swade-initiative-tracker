import { Box } from "@mui/material";

interface PhaseReminderProps {
  title: string;
  description: string;
}

export function PhaseReminder({ title, description }: PhaseReminderProps) {
  return (
    <Box
      sx={{
        bgcolor: "action.hover",
        color: "text.primary",
        fontSize: "0.75rem",
        px: 2,
        py: 1,
        textAlign: "left",
      }}
    >
      <strong>{title}:</strong> {description}
    </Box>
  );
}