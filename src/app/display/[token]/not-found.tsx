import { Monitor } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function DisplayNotFound() {
  const t = await getTranslations("display");
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem",
        backgroundColor: "#0a0a0a",
        color: "#ffffff",
        textAlign: "center",
      }}
    >
      <Monitor
        size={56}
        style={{ color: "#525252", marginBottom: "1.5rem" }}
      />
      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: 600,
          margin: 0,
          color: "#ffffff",
        }}
      >
        {t("notFound")}
      </h1>
      <p
        style={{
          fontSize: "0.875rem",
          color: "#737373",
          marginTop: "0.75rem",
          maxWidth: "20rem",
          lineHeight: 1.5,
        }}
      >
        {t("invalidToken")}
      </p>
    </div>
  );
}
