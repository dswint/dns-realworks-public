type LogFields = Record<string, unknown>;

function write(
  level: "info" | "warn" | "error",
  message: string,
  fields?: LogFields,
) {
  const payload = { level, message, ...fields, t: new Date().toISOString() };
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
}

export const logger = {
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, fields?: LogFields) =>
    write("error", message, fields),
};
