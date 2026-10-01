import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-700.css";
import "@fontsource/manrope/latin-800.css";
import React, { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  Upload,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  Minus,
  Maximize,
  RotateCcw,
  Eye,
  EyeOff,
  SlidersHorizontal,
  MousePointer2,
  Move,
  Layers,
  X,
  ArrowUpRight,
  ShieldCheck,
  BookOpen,
  ScanFace,
  Loader2,
  CircleHelp,
} from "lucide-react";
import { construct, stages, type Point } from "./geometry";
import { detect } from "./detector";
import "./style.css";
const colors = [
  "#db583c",
  "#eaa649",
  "#f4eee0",
  "#55a9a4",
  "#8d83ca",
  "#283c3a",
];
const defaults = { x: 0, y: 0, scale: 100, rotation: 0 };
function App() {
  const [source, setSource] = useState("/sample.jpg"),
    [name, setName] = useState("Portrait study.jpg"),
    [size, setSize] = useState({ w: 1045, h: 1568 }),
    [faces, setFaces] = useState<Point[][]>([]),
    [face, setFace] = useState(0),
    [chooseFace, setChooseFace] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [step, setStep] = useState(5),
    [visible, setVisible] = useState([true, true, true, true, true, true]),
    [color, setColor] = useState(colors[0]),
    [opacity, setOpacity] = useState(90),
    [weight, setWeight] = useState(2),
    [photoOpacity, setPhotoOpacity] = useState(100),
    [photoVisible, setPhotoVisible] = useState(true),
    [adjust, setAdjust] = useState(defaults),
    [tab, setTab] = useState("layers"),
    [zoom, setZoom] = useState(100),
    [mode, setMode] = useState("select"),
    [exportOpen, setExportOpen] = useState(false),
    [help, setHelp] = useState(false),
    [dragging, setDragging] = useState(false),
    [toast, setToast] = useState(""),
    [overlayOnly, setOverlayOnly] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    svg = useRef<SVGSVGElement>(null),
    job = useRef(0),
    uploadJob = useRef(0),
    drag = useRef<{ x: number; y: number; ax: number; ay: number } | null>(
      null,
    );
  const geometry = faces[face] ? construct(faces[face], size.w, size.h) : null;
  useEffect(() => {
    if (!source) return;
    let canceled = false;
    const id = ++job.current;
    setLoading(true);
    setError("");
    setFaces([]);
    const image = new Image();
    image.onload = async () => {
      if (canceled) return;
      setSize({ w: image.naturalWidth, h: image.naturalHeight });
      try {
        const result = await detect(image);
        if (canceled || id !== job.current) return;
        setFaces(result);
        setFace(0);
        setChooseFace(result.length > 1);
        if (!result.length)
          setError(
            "No face could be detected. Please upload a clearer portrait.",
          );
      } catch {
        if (!canceled)
          setError(
            "Face detection could not start. Please reload or try another browser with WebAssembly support.",
          );
      } finally {
        if (!canceled) setLoading(false);
      }
    };
    image.onerror = () => {
      if (!canceled) {
        setLoading(false);
        setError(
          "This image could not be opened. Try a JPG, PNG or WebP file.",
        );
      }
    };
    image.src = source;
    return () => {
      canceled = true;
    };
  }, [source]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(
    () => () => {
      if (source.startsWith("blob:")) URL.revokeObjectURL(source);
    },
    [source],
  );
  async function upload(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setToast("Please choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setToast("Please choose an image under 30 MB.");
      return;
    }
    const uploadId = ++uploadJob.current;
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas
        .getContext("2d")!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const blob = await new Promise<Blob | null>((r) =>
        canvas.toBlob(r, "image/png"),
      );
      if (!blob) throw Error();
      if (uploadId !== uploadJob.current) return;
      setSource(URL.createObjectURL(blob));
      setName(file.name);
      setAdjust(defaults);
      setZoom(100);
      setStep(5);
      setVisible([true, true, true, true, true, true]);
    } catch {
      setToast("This image could not be opened. Try another image.");
    }
  }
  function reset() {
    job.current++;
    uploadJob.current++;
    setChooseFace(false);
    setExportOpen(false);
    setVisible([true, true, true, true, true, true]);
    setColor(colors[0]);
    setOpacity(90);
    setWeight(2);
    setMode("select");
    setTab("layers");
    setOverlayOnly(false);
    setSource("");
    setFaces([]);
    setLoading(false);
    setError("");
    setAdjust(defaults);
    setStep(0);
    setZoom(100);
    setPhotoOpacity(100);
    setPhotoVisible(true);
  }
  async function download(format: "png" | "svg") {
    setExportOpen(false);
    if (!svg.current || !geometry) return;
    try {
      const clone = svg.current.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("width", String(size.w));
      clone.setAttribute("height", String(size.h));
      const img = clone.querySelector("image");
      if (overlayOnly) img?.remove();
      else if (img) {
        const blob = await (await fetch(source)).blob();
        const data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.readAsDataURL(blob);
        });
        img.setAttribute("href", data);
      }
      const xml = new XMLSerializer().serializeToString(clone);
      let blob = new Blob([xml], { type: "image/svg+xml" });
      if (format === "png") {
        const url = URL.createObjectURL(blob);
        const image = new Image();
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = reject;
          image.src = url;
        });
        const canvas = document.createElement("canvas");
        canvas.width = size.w;
        canvas.height = size.h;
        canvas.getContext("2d")!.drawImage(image, 0, 0);
        URL.revokeObjectURL(url);
        blob = (await new Promise<Blob | null>((r) =>
          canvas.toBlob(r, "image/png"),
        ))!;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name.replace(/\.[^.]+$/, "")}-loomis.${format}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setToast(`${format.toUpperCase()} exported successfully`);
    } catch {
      setToast("Export failed. Please try again.");
    }
  }
  const range = (
    label: string,
    value: number,
    min: number,
    max: number,
    onChange: (n: number) => void,
    suffix = "%",
    stride = 1,
  ) => (
    <div className="range-field">
      <div>
        <label>{label}</label>
        <span>
          {value}
          {suffix}
        </span>
      </div>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={stride}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={
          {
            "--fill": `${((value - min) / (max - min)) * 100}%`,
          } as React.CSSProperties
        }
      />
    </div>
  );
  return (
    <div className="app">
      <header className="header">
        <a className="brand" href="/" aria-label="Loomis Studio home">
          <span className="brand-icon">
            <span />
          </span>
          Loomis<span className="brand-light">Studio</span>
        </a>
        <div className="header-center">
          A little structure. A better drawing.
        </div>
        <button className="text-button" onClick={() => setHelp(true)}>
          <BookOpen size={16} /> The Loomis method <ArrowUpRight size={14} />
        </button>
        <span className="header-divider" />
        <button
          className="icon-button"
          onClick={() => setHelp(true)}
          aria-label="Help"
        >
          <CircleHelp size={19} />
        </button>
      </header>
      <main>
        <section className="intro">
          <div>
            <div className="eyebrow">
              <span /> YOUR REFERENCE, REIMAGINED
            </div>
            <h1>
              See the structure.<span> Draw with confidence.</span>
            </h1>
            <p>
              Turn any portrait into a step-by-step Loomis head construction.
            </p>
          </div>
          <div className="private-badge">
            <ShieldCheck size={18} />
            <div>
              Made for your eyes only<span>Photos stay on your device</span>
            </div>
          </div>
        </section>
        <div className="workspace">
          <aside className="left-panel">
            <div className="panel-heading">
              <span>Reference image</span>
              <span className="tiny-label">01</span>
            </div>
            <button
              className={`upload-box ${dragging ? "dragging" : ""}`}
              onClick={() => input.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                upload(e.dataTransfer.files[0]);
              }}
            >
              <span className="upload-icon">
                <Upload size={20} />
              </span>
              <strong>Drop your portrait here</strong>
              <span>
                or <b>browse files</b>
              </span>
              <small>JPG, PNG, WEBP · Up to 30 MB</small>
            </button>
            <input
              ref={input}
              hidden
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                upload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {source ? (
              <div className="file-card">
                <img src={source} />
                <div>
                  <strong>{name}</strong>
                  <span>
                    {size.w} × {size.h} px
                  </span>
                </div>
                <button onClick={reset} aria-label="Remove image">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                className="sample-button"
                onClick={() => {
                  setSource("/sample.jpg");
                  setName("Portrait study.jpg");
                }}
              >
                Try the example portrait <ArrowUpRight size={14} />
              </button>
            )}
            <div className="steps-title">
              <div className="panel-heading">Construction steps</div>
              <span>{step + 1} / 6</span>
            </div>
            <div className="steps">
              {stages.map((s, i) => (
                <button
                  key={s.name}
                  className={`step ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
                  onClick={() => setStep(i)}
                >
                  <span className="step-number">
                    {i < step ? (
                      <Check size={13} />
                    ) : (
                      String(i + 1).padStart(2, "0")
                    )}
                  </span>
                  <span>
                    <strong>{s.name}</strong>
                    <small>{s.detail}</small>
                  </span>
                  {i === step && <ChevronRight size={15} />}
                </button>
              ))}
            </div>
            <div className="step-tip">
              <span className="tip-symbol">✧</span>
              <div>
                <strong>Build it, one form at a time.</strong>
                <p>
                  Move through the steps to understand how the head comes
                  together.
                </p>
              </div>
            </div>
            <button className="reset-button" onClick={reset}>
              <RotateCcw size={14} /> Reset workspace
            </button>
          </aside>
          <section className="canvas-panel">
            <div className="canvas-toolbar">
              <div className="canvas-title">
                <span className="status-dot" /> Portrait workspace{" "}
                <span className="sample-label">
                  {source === "/sample.jpg" ? "EXAMPLE" : "LOCAL"}
                </span>
              </div>
              <div className="tool-actions">
                <button
                  className={mode === "select" ? "selected" : ""}
                  title="Select tool"
                  aria-label="Select tool"
                  onClick={() => setMode("select")}
                >
                  <MousePointer2 size={17} />
                </button>
                <button
                  className={mode === "move" ? "selected" : ""}
                  title="Move construction"
                  aria-label="Move construction"
                  onClick={() => {
                    setMode("move");
                    setTab("adjust");
                  }}
                >
                  <Move size={17} />
                </button>
                <span />
                <button
                  title="Fit to view"
                  aria-label="Fit to view"
                  onClick={() => setZoom(100)}
                >
                  <Maximize size={16} />
                </button>
              </div>
            </div>
            <div
              className={`canvas-area ${mode === "move" ? "move-mode" : ""}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                upload(e.dataTransfer.files[0]);
              }}
            >
              {source ? (
                <>
                  <div
                    className="image-stage"
                    style={{
                      aspectRatio: `${size.w}/${size.h}`,
                      transform: `scale(${zoom / 100})`,
                    }}
                  >
                    <svg
                      ref={svg}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox={`0 0 ${size.w} ${size.h}`}
                      onPointerDown={(e) => {
                        if (mode !== "move" || !geometry) return;
                        e.currentTarget.setPointerCapture(e.pointerId);
                        drag.current = {
                          x: e.clientX,
                          y: e.clientY,
                          ax: adjust.x,
                          ay: adjust.y,
                        };
                      }}
                      onPointerMove={(e) => {
                        if (!drag.current) return;
                        const ratio =
                          size.w /
                          e.currentTarget.getBoundingClientRect().width;
                        setAdjust((v) => ({
                          ...v,
                          x:
                            drag.current!.ax +
                            (e.clientX - drag.current!.x) * ratio,
                          y:
                            drag.current!.ay +
                            (e.clientY - drag.current!.y) * ratio,
                        }));
                      }}
                      onPointerUp={() => (drag.current = null)}
                      onPointerCancel={() => (drag.current = null)}
                    >
                      <image
                        href={source}
                        width={size.w}
                        height={size.h}
                        opacity={photoVisible ? photoOpacity / 100 : 0}
                      />
                      {geometry && (
                        <g
                          transform={`translate(${geometry.cx + adjust.x} ${geometry.cy + adjust.y}) rotate(${geometry.angle + adjust.rotation}) scale(${adjust.scale / 100})`}
                          fill="none"
                          stroke={color}
                          strokeWidth={(weight * size.w) / 520}
                          strokeOpacity={opacity / 100}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          {geometry.layers.map(
                            (layer, i) =>
                              i <= step &&
                              visible[i] && (
                                <g key={i}>
                                  {layer.map((shape, j) =>
                                    React.createElement(shape.tag, {
                                      ...shape.attrs,
                                      key: j,
                                    }),
                                  )}
                                </g>
                              ),
                          )}
                        </g>
                      )}
                    </svg>
                  </div>
                  {loading && (
                    <div className="canvas-notice">
                      <Loader2 className="spin" size={19} />
                      <strong>Finding the form…</strong>
                      <span>Analyzing facial landmarks on your device</span>
                    </div>
                  )}
                  {error && (
                    <div className="canvas-notice error">
                      <ScanFace size={25} />
                      <strong>{error}</strong>
                      <button onClick={() => input.current?.click()}>
                        Choose another portrait
                      </button>
                    </div>
                  )}
                  {geometry && !loading && (
                    <div className="detection-badge">
                      <span />
                      <ScanFace size={14} />
                      {faces.length > 1 ? (
                        <button onClick={() => setChooseFace(true)}>
                          Face {face + 1} of {faces.length} · Change
                        </button>
                      ) : (
                        "Face landmarks detected"
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <ScanFace size={48} />
                  <h2>A new perspective starts here.</h2>
                  <p>Upload a portrait to find the structure beneath.</p>
                  <button
                    className="primary"
                    onClick={() => input.current?.click()}
                  >
                    <Upload size={16} /> Choose a portrait
                  </button>
                </div>
              )}
              <div className="zoom-control">
                <button
                  aria-label="Zoom out"
                  onClick={() => setZoom(Math.max(50, zoom - 10))}
                >
                  <Minus size={15} />
                </button>
                <span>{zoom}%</span>
                <button
                  aria-label="Zoom in"
                  onClick={() => setZoom(Math.min(200, zoom + 10))}
                >
                  <Plus size={15} />
                </button>
                <i />
                <button aria-label="Reset zoom" onClick={() => setZoom(100)}>
                  <Maximize size={14} />
                </button>
              </div>
              <div className="canvas-corner">
                {source ? "REFERENCE + CONSTRUCTION" : "YOUR NEXT STUDY"}
              </div>
            </div>
            <div className="step-navigation">
              <button
                aria-label="Previous step"
                disabled={step === 0}
                onClick={() => setStep(step - 1)}
              >
                <ChevronLeft size={18} />
              </button>
              <div>
                <span>STEP {String(step + 1).padStart(2, "0")}</span>
                <strong>{stages[step].name}</strong>
              </div>
              <div className="step-dots">
                {stages.map((_, i) => (
                  <button
                    aria-label={`Go to step ${i + 1}`}
                    key={i}
                    className={i <= step ? "filled" : ""}
                    onClick={() => setStep(i)}
                  />
                ))}
              </div>
              <button
                aria-label="Next step"
                disabled={step === 5}
                onClick={() => setStep(step + 1)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </section>
          <aside className="right-panel">
            <div className="tabs">
              <button
                className={tab === "layers" ? "active" : ""}
                onClick={() => setTab("layers")}
              >
                <Layers size={15} /> Layers
              </button>
              <button
                className={tab === "adjust" ? "active" : ""}
                onClick={() => setTab("adjust")}
              >
                <SlidersHorizontal size={15} /> Adjust
              </button>
            </div>
            {tab === "layers" ? (
              <>
                <div className="section-label">
                  CONSTRUCTION LAYERS{" "}
                  <span>
                    {visible.filter((v, i) => v && i <= step).length} visible
                  </span>
                </div>
                <div className="layer-list">
                  {stages.map((s, i) => (
                    <button
                      className={i > step ? "future" : ""}
                      aria-pressed={visible[i]}
                      key={s.name}
                      onClick={() =>
                        setVisible((v) => v.map((x, j) => (i === j ? !x : x)))
                      }
                    >
                      <span
                        className={`layer-check ${visible[i] ? "checked" : ""}`}
                      >
                        {visible[i] && <Check size={11} />}
                      </span>
                      <span>
                        {i === 2
                          ? "Center & brow"
                          : i === 3
                            ? "Feature guidelines"
                            : i === 5
                              ? "Feature accents"
                              : s.name}
                      </span>
                      {visible[i] ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="adjust-controls">
                <p>
                  Fine-tune the detected construction. Use the move tool to drag
                  it into place.
                </p>
                {range(
                  "Horizontal offset",
                  Math.round(adjust.x),
                  -size.w / 2,
                  size.w / 2,
                  (n) => setAdjust({ ...adjust, x: n }),
                  " px",
                )}
                {range(
                  "Vertical offset",
                  Math.round(adjust.y),
                  -size.h / 2,
                  size.h / 2,
                  (n) => setAdjust({ ...adjust, y: n }),
                  " px",
                )}
                {range("Scale", adjust.scale, 60, 150, (n) =>
                  setAdjust({ ...adjust, scale: n }),
                )}
                {range(
                  "Rotation",
                  adjust.rotation,
                  -45,
                  45,
                  (n) => setAdjust({ ...adjust, rotation: n }),
                  "°",
                )}
                <button className="restore" onClick={() => setAdjust(defaults)}>
                  <RotateCcw size={13} /> Restore detected fit
                </button>
              </div>
            )}
            <div className="style-section">
              <div className="section-label">LINE STYLE</div>
              <label className="field-label">Line color</label>
              <div className="color-options">
                {colors.map((c) => (
                  <button
                    key={c}
                    aria-label={`Use ${c} lines`}
                    className={color === c ? "chosen" : ""}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                  >
                    {color === c && <Check size={13} />}
                  </button>
                ))}
                <label className="custom-color" title="Custom line color">
                  <Plus size={14} />
                  <input
                    type="color"
                    aria-label="Custom line color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </label>
              </div>
              {range("Opacity", opacity, 10, 100, setOpacity)}
              {range("Line thickness", weight, 0.5, 5, setWeight, " px", 0.5)}
            </div>
            <div className="reference-section">
              <div className="section-label">
                REFERENCE PHOTO
                <button
                  aria-label="Toggle reference photo"
                  onClick={() => setPhotoVisible(!photoVisible)}
                >
                  {photoVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
              </div>
              {range("Photo opacity", photoOpacity, 0, 100, setPhotoOpacity)}
            </div>
            <div className="export-section">
              <div className="export-wrapper">
                <button
                  className="export-button"
                  disabled={!geometry || loading}
                  onClick={() => setExportOpen(!exportOpen)}
                >
                  <Download size={16} /> Export drawing{" "}
                  <ChevronDown size={15} />
                </button>
                {exportOpen && (
                  <div className="export-menu">
                    <label>
                      <input
                        type="checkbox"
                        checked={overlayOnly}
                        onChange={(e) => setOverlayOnly(e.target.checked)}
                      />{" "}
                      Construction only
                    </label>
                    <button onClick={() => download("png")}>
                      Download PNG <span>Image</span>
                    </button>
                    <button onClick={() => download("svg")}>
                      Download SVG <span>Vector</span>
                    </button>
                  </div>
                )}
              </div>
              <p>Your reference. Your lines. Ready to draw.</p>
            </div>
          </aside>
        </div>
        <section className="below-workspace">
          <div className="insight">
            <span className="insight-icon">
              <BookOpen size={18} />
            </span>
            <div>
              <strong>
                {stages[step].name === "Complete construction"
                  ? "A framework, not a formula."
                  : stages[step].name + "."}
              </strong>
              <p>{stages[step].tip}</p>
            </div>
          </div>
          <button onClick={() => setHelp(true)}>
            Get to know the Loomis method <ArrowUpRight size={15} />
          </button>
        </section>
        <footer>
          <span>
            <span className="mini-logo">◉</span> Built for the art of
            observation.
          </span>
          <span>
            Local processing <i /> No account needed <i /> Just you and your
            reference
          </span>
        </footer>
      </main>
      {toast && (
        <div role="status" className="toast">
          <Check size={16} />
          {toast}
          <button onClick={() => setToast("")}>
            <X size={14} />
          </button>
        </div>
      )}
      {chooseFace && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Choose your subject</h2>
            <p>
              We found {faces.length} faces. Select the one you’d like to study.
            </p>
            <div className="face-options">
              {faces.map((f, i) => {
                const xs = f.map((p) => p.x),
                  ys = f.map((p) => p.y),
                  x = Math.min(...xs) * size.w,
                  y = Math.min(...ys) * size.h,
                  w = (Math.max(...xs) - Math.min(...xs)) * size.w,
                  h = (Math.max(...ys) - Math.min(...ys)) * size.h;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setFace(i);
                      setAdjust(defaults);
                      setChooseFace(false);
                    }}
                  >
                    <svg
                      viewBox={`${x - w * 0.15} ${y - h * 0.15} ${w * 1.3} ${h * 1.3}`}
                    >
                      <image href={source} width={size.w} height={size.h} />
                    </svg>
                    Face {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {help && (
        <div className="modal-backdrop" onClick={() => setHelp(false)}>
          <div className="modal guide" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              aria-label="Close guide"
              onClick={() => setHelp(false)}
            >
              <X size={20} />
            </button>
            <div className="eyebrow">THE ART OF CONSTRUCTION</div>
            <h2>Find the form beneath the face.</h2>
            <p>
              Andrew Loomis’s method simplifies the head into a sphere,
              flattened side planes, and an attached jaw. It’s a guide to seeing
              volume—not a rigid template.
            </p>
            {stages.slice(0, 5).map((s, i) => (
              <div className="guide-step" key={s.name}>
                <b>0{i + 1}</b>
                <div>
                  <strong>{s.name}</strong>
                  <p>{s.tip}</p>
                </div>
              </div>
            ))}
            <div className="guide-note">
              <ShieldCheck size={18} />
              <p>
                Face Mesh runs locally with bundled model files. Geometry is an
                artist’s approximation of 3D form from a 2D photo. Extreme
                profiles, occlusion and strong perspective may need manual
                adjustment. Ear positions are not detected. Example photograph
                via Unsplash.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
