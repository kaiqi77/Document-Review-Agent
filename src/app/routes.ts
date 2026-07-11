import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { DocumentUpload } from "./components/DocumentUpload";
import { TaskList } from "./components/TaskList";
import { ResultDetail } from "./components/ResultDetail";
import { KnowledgeBase } from "./components/KnowledgeBase";
import { SystemSetting } from "./components/SystemSetting";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "upload", Component: DocumentUpload },
      { path: "tasks", Component: TaskList },
      { path: "tasks/:id", Component: ResultDetail },
      { path: "knowledge", Component: KnowledgeBase },
      { path: "settings", Component: SystemSetting },
    ],
  },
]);
