import { useEffect, useState } from "react";
import {
  Monitor,
  Smartphone,
  Square,
  Play,
  ShieldCheck,
  RotateCw,
} from "lucide-react";
import { createPreviewDocument } from "../utils/preview";
export default function Preview({ code, runId }) {
  const [mobile, setMobile] = useState(false),
    [stopped, setStopped] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    setStopped(false);
    const timeout = setTimeout(() => setStopped(true), 30000);
    return () => clearTimeout(timeout);
  }, [runId, revision]);
  return (
    <section className="preview-panel">
      <div className="workspace-panel-heading">
        <span>
          <span className="live-dot" />
          Live preview
        </span>
        <div>
          <button
            aria-label="Desktop preview"
            aria-pressed={!mobile}
            className={`icon-btn ${!mobile ? "selected" : ""}`}
            onClick={() => setMobile(false)}
          >
            <Monitor size={15} />
          </button>
          <button
            aria-label="Mobile preview"
            aria-pressed={mobile}
            className={`icon-btn ${mobile ? "selected" : ""}`}
            onClick={() => setMobile(true)}
          >
            <Smartphone size={15} />
          </button>
          <button
            className="icon-btn"
            aria-label="Stop preview"
            onClick={() => setStopped(true)}
          >
            <Square size={13} />
          </button>
          <button
            className="icon-btn"
            aria-label="Restart preview"
            onClick={() => setRevision((v) => v + 1)}
          >
            <RotateCw size={14} />
          </button>
        </div>
      </div>
      <div className="preview-address">
        <span />
        <span />
        <span />
        <span className="preview-url">
          <ShieldCheck size={12} />
          sandbox / preview
        </span>
      </div>
      <div className={`preview-canvas ${mobile ? "device-mobile" : ""}`}>
        {stopped ? (
          <div className="preview-paused">
            <ShieldCheck size={28} />
            <strong>Preview paused</strong>
            <p>Previews pause after 30 seconds. Run again to continue.</p>
            <button
              className="btn btn-secondary"
              onClick={() => setRevision((v) => v + 1)}
            >
              <Play size={14} />
              Restart preview
            </button>
          </div>
        ) : (
          <iframe
            key={`${runId}-${revision}`}
            title="Sandboxed challenge preview"
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
            srcDoc={createPreviewDocument(code)}
          />
        )}
      </div>
      <div className="workspace-status">
        <ShieldCheck size={12} />
        Isolated preview · External resources blocked
      </div>
    </section>
  );
}
