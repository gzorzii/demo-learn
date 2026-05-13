import { createBrowserRouter } from "react-router";
import { Root } from "./components/Layout";
import { Home } from "./pages/Home";
import { TeamManagement } from "./pages/TeamManagement";
import { Calibration } from "./pages/Calibration";
import { History } from "./pages/History";
import { FAQ } from "./pages/FAQ";
import { PerformanceCycle } from "./pages/PerformanceCycle";
import { LoginPage } from "./pages/LoginPage";
import { PrivateRoute } from "./components/routing/PrivateRoute";

export const router = createBrowserRouter([
  { path: "/login", Component: LoginPage },
  {
    Component: PrivateRoute,
    children: [
      {
        path: "/",
        Component: Root,
        children: [
          { index: true, Component: Home },
          { path: "performance-cycle", Component: PerformanceCycle },
          { path: "team", Component: TeamManagement },
          { path: "calibration", Component: Calibration },
          { path: "history", Component: History },
          { path: "faq", Component: FAQ },
        ],
      },
    ],
  },
]);