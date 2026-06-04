import { LandingPage } from "../components/landing-page";
import { getCatalog, getOperationsDashboard, getProviders } from "../lib/api";

export default async function StudioPage() {
  const [providers, catalog, dashboard] = await Promise.all([
    getProviders(),
    getCatalog(),
    getOperationsDashboard()
  ]);
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

  return (
    <LandingPage
      apiBaseUrl={apiBaseUrl}
      catalog={catalog}
      dashboard={dashboard}
      providers={providers}
    />
  );
}
