import { Resend } from "resend";

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? "noreply@localhost";
  if (!key) {
    console.info(
      `[mail:dev] to=${input.to} subject=${input.subject}\n${input.text}`,
    );
    return;
  }
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
  });
  if (error) throw new Error(error.message);
}
