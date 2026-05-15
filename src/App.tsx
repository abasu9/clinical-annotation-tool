import React, { useEffect, useState } from "react";
import { Dataset } from "./lib/supabase";
import Header from "./components/Header";
import AnnotatorLogin, {
  clearStoredAnnotatorId,
  loadStoredAnnotatorId,
} from "./components/AnnotatorLogin";
import AdminPanel from "./components/AdminPanel";
import DatasetSelector from "./components/DatasetSelector";
import AnnotationPage from "./components/AnnotationPage";
import AdminPasswordGate from "./components/AdminPasswordGate";
import { isAdminUnlocked, lockAdmin } from "./lib/adminGate";

type View = "login" | "admin" | "selectDataset" | "annotate";

export default function App() {
  const [view, setView] = useState<View>("login");
  const [annotatorId, setAnnotatorId] = useState("");
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [adminUnlocked, setAdminUnlocked] = useState(isAdminUnlocked);

  useEffect(() => {
    const stored = loadStoredAnnotatorId();
    if (stored) {
      setAnnotatorId(stored);
      setView("selectDataset");
    }
  }, []);

  const handleLogout = () => {
    clearStoredAnnotatorId();
    setAnnotatorId("");
    setDataset(null);
    setView("login");
  };

  if (view === "login") {
    return (
      <AnnotatorLogin
        onLogin={(id) => {
          setAnnotatorId(id);
          setView("selectDataset");
        }}
        onAdmin={() => setView("admin")}
      />
    );
  }

  const exitAdmin = () => {
    lockAdmin();
    setAdminUnlocked(false);
    setView(annotatorId ? "selectDataset" : "login");
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
    return <AdminPanel onBack={exitAdmin} backLabel="Lock admin" />;
  }

  if (view === "selectDataset") {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header
          annotatorId={annotatorId}
          onAdmin={() => setView("admin")}
          onLogout={handleLogout}
        />
        <DatasetSelector
          onSelect={(d) => {
            setDataset(d);
            setView("annotate");
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        annotatorId={annotatorId}
        datasetName={dataset?.name}
        totalSamples={dataset?.total_samples}
        onAdmin={() => setView("admin")}
        onLogout={handleLogout}
      />
      {dataset && (
        <AnnotationPage
          dataset={dataset}
          annotatorId={annotatorId}
          onBackToDatasets={() => {
            setDataset(null);
            setView("selectDataset");
          }}
        />
      )}
    </div>
  );
}
