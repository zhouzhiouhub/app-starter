import { PageRenderer } from "@app-starter/renderer";
import { exampleLandingPage } from "@app-starter/schema";

export default function HomePage() {
  return <PageRenderer schema={exampleLandingPage} viewport="desktop" />;
}
