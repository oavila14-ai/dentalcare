import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type AppointmentEmailProps = {
  clinicName: string;
  preview: string;
  heading: string;
  intro: string;
  details: { label: string; value: string }[];
  note?: { title: string; text: string };
  cta?: { label: string; url: string };
  footer?: string;
  tone?: "brand" | "success" | "danger" | "neutral";
};

const TONES = {
  brand: "linear-gradient(120deg,#0ea5a4,#22d3ee 45%,#6366f1)",
  success: "linear-gradient(120deg,#059669,#0ea5a4)",
  danger: "linear-gradient(120deg,#e11d48,#f97316)",
  neutral: "linear-gradient(120deg,#475569,#334155)",
};
const SOLID = { brand: "#0ea5a4", success: "#059669", danger: "#e11d48", neutral: "#475569" };

export function AppointmentEmail({
  clinicName,
  preview,
  heading,
  intro,
  details,
  note,
  cta,
  footer,
  tone = "brand",
}: AppointmentEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, background: "#f1f5f9", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif", color: "#0f172a" }}>
        <Container style={{ maxWidth: 520, margin: "32px auto", background: "#ffffff", borderRadius: 20, overflow: "hidden", boxShadow: "0 10px 30px -12px rgba(15,23,42,.18)" }}>
          <Section style={{ background: SOLID[tone], backgroundImage: TONES[tone], padding: "28px 32px", color: "#ffffff" }}>
            <Text style={{ margin: 0, fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", opacity: 0.9, color: "#ffffff" }}>{clinicName}</Text>
            <Heading as="h1" style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 700, color: "#ffffff" }}>{heading}</Heading>
          </Section>
          <Section style={{ padding: 32 }}>
            <Text style={{ margin: "0 0 20px", fontSize: 16, lineHeight: 1.6 }}>{intro}</Text>
            <Section style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "8px 20px" }}>
              {details.map((d) => (
                <Text key={d.label} style={{ margin: "10px 0", fontSize: 15 }}>
                  <span style={{ color: "#64748b" }}>{d.label}: </span>
                  <strong>{d.value}</strong>
                </Text>
              ))}
            </Section>
            {note && (
              <Section style={{ marginTop: 16, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 14, padding: "4px 20px" }}>
                <Text style={{ margin: "12px 0 4px", fontSize: 14, fontWeight: 600 }}>{note.title}</Text>
                <Text style={{ margin: "0 0 12px", fontSize: 14, color: "#7c2d12" }}>{note.text}</Text>
              </Section>
            )}
            {cta && (
              <Section style={{ marginTop: 24 }}>
                <Button href={cta.url} style={{ background: SOLID[tone], backgroundImage: TONES[tone], color: "#ffffff", padding: "14px 28px", borderRadius: 12, fontWeight: 600, fontSize: 15, textDecoration: "none" }}>
                  {cta.label}
                </Button>
              </Section>
            )}
            <Hr style={{ borderColor: "#e2e8f0", margin: "28px 0 16px" }} />
            <Text style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#64748b" }}>
              {footer ?? "Este es un mensaje automático. Si necesitas ayuda, responde a este correo o contáctanos por WhatsApp."}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
