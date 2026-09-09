// Web router.
// Metro picks this file over src/router.tsx when bundling for the web
// platform (react-native-web), so it must expose the same named exports.
import { BrowserRouter } from "react-router-dom";

// Re-export everything except `Router` (the low-level primitive both
// packages export) — we replace it with the platform's top-level router
// component so callers can just do `<Router>...</Router>`.
export {
  Routes,
  Route,
  Navigate,
  Outlet,
  Link,
  useNavigate,
  useParams,
  useLocation,
  useSearchParams,
} from "react-router-dom";
export const Router = BrowserRouter;
