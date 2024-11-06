import type { Metadata } from "next";
import type { ReactElement } from "react";

const title = "Formula by Compasso";
const description = "Manage your project expenses";

export const metadata: Metadata = {
  title,
  description,
};

const ProjectsPage = async (): Promise<ReactElement> => {
  return <main className="pt-2">projects</main>;
};

export default ProjectsPage;
