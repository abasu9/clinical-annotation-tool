import React, { useEffect, useState } from "react";
import { Dataset } from "./lib/supabase";
import AppInteriorShell from "./components/AppInteriorShell";
import Header from "./components/Header";
import AnnotatorLogin, {
  clearStoredAnnotatorId,
  loadStoredAnnotatorId,
} from "./components/AnnotatorLogin";
import AdminPanel from "./components/AdminPanel";
import DatasetSelector from "./components/DatasetSelector";
import AnnotationPage from "./components/AnnotationPage";
import RatingPage from "./components/RatingPage";
import ModeSelect, { type WorkMode } from "./components/ModeSelect";
import AdminPasswordGate from "./components/AdminPasswordGate";
import { isAdminUnlocked, lockAdmin } from "./lib/adminGate";

type View =
  | "login"
  | "mode"
  | "admin"
  | "selectDataset"
  | "annotate"
  | "rate";

const MODE_STORAGE_KEY = "work_mode";

function loadStoredMode(): WorkMode | null {
  try {
    const v = localStorage.getItem(MODE_STORAGE_KEY);
    if (v === "annotate" || v === "rate") return v;
  } catch {
    /* ignore */
  }
  return null;
}

function saveStoredMode(mode: WorkMode) {
  try {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

function clearStoredMode() {
  try {
    localStorage.removeItem(MODE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export default function App() {
  const [view, setView] = useState<View>("login");
  const [annotatorId, setAnnotatorId] = useState("");
  const [mode, setMode] = useState<WorkMode | null>(null);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [adminUnlocked, setAdminUnlocked] = useState(isAdminUnlocked);

  useEffect(() => {
    const stored = loadStoredAnnotatorId();
    if (stored) {
      setAnnotatorId(stored);
      // Always show Annotation vs Rating so the chooser is never skipped.
      clearStoredMode();
      setMode(null);
      setView("mode");
    }
  }, []);

  const handleLogout = () => {
    clearStoredAnnotatorId();
    clearStoredMode();
    setAnnotatorId("");
    setMode(null);
    setDataset(null);
    setView("login");
  };

  if (view === "login") {
    return (
      <AnnotatorLogin
        onLogin={(id) => {
          setAnnotatorId(id);
          setMode(null);
          clearStoredMode();
          setView("mode");
        }}
        onAdmin={() => setView("admin")}
      />
    );
  }

  const exitAdmin = () => {
    lockAdmin();
    setAdminUnlocked(false);
    setView(annotatorId ? (mode ? "selectDataset" : "mode") : "login");
  };

  if (view === "admin") {
    if (!adminUnlocked) {
      return (
        <AdminPasswordGate
          onUnlocked={() => setAdminUnlocked(true)}
          onCancel={exitAdmin}
        />
      );
    }
    return (
      <AppInteriorShell>
        <Header
          annotatorId={annotatorId}
          onAdmin={() => {}}
          onLogout={exitAdmin}
        />
        <AdminPanel onBack={exitAdmin} backLabel="Logout" />
      </AppInteriorShell>
    );
  }

  if (view === "mode") {
    return (
      <AppInteriorShell>
        <Header
          annotatorId={annotatorId}
          onAdmin={() => setView("admin")}
          onLogout={handleLogout}
        />
        <ModeSelect
          annotatorId={annotatorId}
          onSelect={(m) => {
            setMode(m);
            saveStoredMode(m);
            setDataset(null);
            setView("selectDataset");
          }}
          onLogout={handleLogout}
        />
      </AppInteriorShell>
    );
  }

  if (view === "selectDataset") {
    return (
      <AppInteriorShell>
        <Header
          annotatorId={annotatorId}
          onAdmin={() => setView("admin")}
          onLogout={handleLogout}
        />
        <DatasetSelector
          annotatorId={annotatorId}
          mode={mode ?? "annotate"}
          onChangeMode={() => {
            setDataset(null);
            clearStoredMode();
            setMode(null);
            setView("mode");
          }}
          onSelect={(d) => {
            setDataset(d);
            setView(mode === "rate" ? "rate" : "annotate");
          }}
        />
      </AppInteriorShell>
    );
  }

  return (
    <AppInteriorShell>
      <Header
        annotatorId={annotatorId}
        datasetName={dataset?.name}
        onAdmin={() => setView("admin")}
        onLogout={handleLogout}
      />
      {dataset && mode === "rate" && view === "rate" ? (
        <RatingPage
          dataset={dataset}
          evaluatorId={annotatorId}
          onBackToDatasets={() => {
            setDataset(null);
            setView("selectDataset");
          }}
        />
      ) : (
        dataset && (
          <AnnotationPage
            dataset={dataset}
            annotatorId={annotatorId}
            onBackToDatasets={() => {
              setDataset(null);
              setView("selectDataset");
            }}
          />
        )
      )}
    </AppInteriorShell>
  );
}
