import { ProjectTextsClient } from "./project-texts-client";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function DashboardProjectTextsPage({ params }: PageProps) {
  const { slug } = await params;
  return <ProjectTextsClient slug={slug} />;
}
