import appointmentTemplate from "@/app/lib/bootstrap/templates/appointment/default.v1.json";

export type AppointmentTemplatePositionSummary = {
  key: string;
  displayName: string;
  defaultScope: "GLOBAL" | "PLATOON";
};

export const DEFAULT_APPOINTMENT_TEMPLATE_POSITIONS: AppointmentTemplatePositionSummary[] =
  appointmentTemplate.positions.map((position) => ({
    key: position.key,
    displayName: position.displayName,
    defaultScope: position.defaultScope as "GLOBAL" | "PLATOON",
  }));
