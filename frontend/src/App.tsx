import { FormEvent, KeyboardEvent, useRef, useState } from "react";
import "./App.css";

interface GenerateResponse {
  review?: string;
  message?: string | string[];
}

export default function App() {
  const [shopName, setShopName] = useState("");
  const [shopType, setShopType] = useState("");
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // IME 组合输入中标记（避免中文输入 Enter 误触发）
  const composingRef = useRef(false);

  const handleGenerate = async () => {
    if (loading) return;
    if (!shopName.trim()) {
      setError("请先输入店铺名称");
      return;
    }
    setLoading(true);
    setError("");
    setReview("");
    setCopied(false);

    try {
      const res = await fetch("/api/review/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName: shopName.trim(),
          shopType: shopType.trim() || undefined,
        }),
      });

      const data: GenerateResponse = await res.json();

      if (!res.ok) {
        const msg = Array.isArray(data.message)
          ? data.message.join("；")
          : data.message || "生成失败，请稍后重试";
        throw new Error(msg);
      }

      setReview(data.review || "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleGenerate();
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !composingRef.current) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleCopy = async () => {
    if (!review) return;
    try {
      await navigator.clipboard.writeText(review);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 兜底：创建临时文本域
      const textarea = document.createElement("textarea");
      textarea.value = review;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="page">
      <div className="orbs" aria-hidden="true">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
      </div>

      <main className="card">
        <header className="header">
          <div className="brand-icon" aria-hidden="true">
            🍜
          </div>
          <span className="badge">AI Powered</span>
          <h1>AI 探店点评生成器</h1>
          <p>输入店铺信息，一键生成地道的探店点评</p>
        </header>

        <form className="form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span className="label">
              店铺名称<em>*</em>
            </span>
            <input
              className="input"
              type="text"
              inputMode="text"
              autoComplete="off"
              placeholder="例如：老王牛肉面"
              value={shopName}
              maxLength={50}
              onChange={(e) => setShopName(e.target.value)}
              onCompositionStart={() => (composingRef.current = true)}
              onCompositionEnd={() => (composingRef.current = false)}
              onKeyDown={handleInputKeyDown}
            />
          </label>

          <label className="field">
            <span className="label">店铺类型（可选）</span>
            <input
              className="input"
              type="text"
              inputMode="text"
              autoComplete="off"
              placeholder="例如：川菜 / 咖啡馆 / 理发店"
              value={shopType}
              maxLength={30}
              onChange={(e) => setShopType(e.target.value)}
              onCompositionStart={() => (composingRef.current = true)}
              onCompositionEnd={() => (composingRef.current = false)}
              onKeyDown={handleInputKeyDown}
            />
          </label>

          <button
            className="btn primary"
            type="submit"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <span className="loading-dots">
                生成中
                <i />
                <i />
                <i />
              </span>
            ) : (
              "生成点评"
            )}
          </button>

          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
        </form>

        {review && (
          <section className="result">
            <div className="result-head">
              <span className="result-title">
                生成结果 <em className="tag-new">新</em>
              </span>
              <button className="btn ghost" type="button" onClick={handleCopy}>
                {copied ? "已复制" : "一键复制"}
              </button>
            </div>
            <div className="review-text">{review}</div>
          </section>
        )}
      </main>

      <footer className="footer">Powered by DeepSeek · NestJS + rsbuild</footer>
    </div>
  );
}
