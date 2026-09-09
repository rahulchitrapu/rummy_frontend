// Native (iOS/Android) router.
// Metro resolves this file for native platforms and src/router.web.tsx for web,
// so the rest of the app can just `import { ... } from "@/router"` and get the
// right implementation for the platform it's running on.
import type { ComponentProps } from "react";
import { NativeRouter } from "react-router-native";

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
} from "react-router-native";

// react-router-dom is already on v7 (its default behavior matches these
// flags, no opt-in needed), but react-router-native is still pinned to the
// v6 core, which warns until you opt in explicitly. Opting in now avoids the
// "React Router Future Flag Warning: ... v7_relativeSplatPath" console
// warning and matches the behavior we'll get once react-router-native (if
// ever) moves to v7.
export function Router(props: ComponentProps<typeof NativeRouter>) {
  return (
    <NativeRouter
      {...props}
      future={{ v7_relativeSplatPath: true, ...props.future }}
    />
  );
}
