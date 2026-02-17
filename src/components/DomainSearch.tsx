import { useState, useEffect, useRef } from "react";

/* ===============================
   安全域名清洗（不会拼接）
================================ */
function clean(v: string) {
  if (!v) return "";

  return v
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("@").pop() || ""
    .replace(/[^a-z0-9.-]/g, "")
    .replace(/\.{2,}/g, ".");
}

/* ===============================
   静态后缀列表（安全）
================================ */
const TLDS = [
  ".com",
  ".ai",
  ".io",
  ".co",
  ".app",
  ".dev",
  ".net",
];

/* ===============================
   生成建议（纯函数）
   ⚠️ 绝不修改 domain
================================ */
function buildSuggestions(input: string) {

  if (!input) return [];

  // 已经完整域名 → 不生成
  if (input.includes(".")) return [];

  return TLDS.map(t => input + t);
}

/* ===============================
   主组件
================================ */
export default function DomainSearch() {

  const [value, setValue] = useState("");

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [show, setShow] = useState(false);
  const [index, setIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);

  /* ===============================
     只根据 value 生成建议
     ⚠️ 不允许 setValue
  =================================*/
  useEffect(() => {

    const timer = setTimeout(() => {

      const cleaned = clean(value);

      if (!cleaned) {
        setSuggestions([]);
        return;
      }

      setSuggestions(buildSuggestions(cleaned));

    }, 120);

    return () => clearTimeout(timer);

  }, [value]);

  /* ===============================
     用户输入（唯一能改 value 的地方）
  =================================*/
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {

    const raw = e.target.value;

    // ⭐ 防字符串爆炸（关键）
    if (raw.length > value.length + 6) {
      console.warn("blocked abnormal input", raw);
      return;
    }

    setValue(clean(raw));
    setShow(true);
  };

  /* ===============================
     粘贴（Google级必须）
  =================================*/
  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    setValue(clean(text));
    setShow(true);
  };

  /* ===============================
     搜索
  =================================*/
  const search = () => {

    if (!value) return;

    let d = value;

    if (!d.includes(".")) {
      d += ".com";
    }

    console.log("SEARCH:", d);

    setShow(false);
  };

  /* ===============================
     键盘
  =================================*/
  const onKeyDown = (e: React.KeyboardEvent) => {

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setShow(true);
      setIndex(i => Math.min(i + 1, suggestions.length - 1));
    }

    else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex(i => Math.max(i - 1, -1));
    }

    else if (e.key === "Enter") {
      e.preventDefault();

      if (show && index >= 0) {
        setValue(suggestions[index]);   // 只有用户按键才允许写
        setShow(false);
      } else {
        search();
      }
    }

    else if (e.key === "Escape") {
      setShow(false);
    }
  };

  const choose = (s: string) => {
    setValue(s);      // 只有点击才写
    setShow(false);
    inputRef.current?.focus();
  };

  return (
    <div style={{ position: "relative", display: "flex", gap: 8 }}>

      <div style={{ flex: 1, position: "relative" }}>

        <input
          ref={inputRef}
          value={value}

          /* ⭐ Safari终极防补全 */
          autoComplete="new-password"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          name="domain-input-39281"

          placeholder="Search domain"

          onChange={onChange}
          onPaste={onPaste}
          onKeyDown={onKeyDown}

          onFocus={() => setShow(true)}

          style={{
            width: "100%",
            padding: 12,
            fontSize: 18
          }}
        />

        {show && suggestions.length > 0 && (
          <div style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: 10,
            marginTop: 4,
            overflow: "hidden"
          }}>
            {suggestions.slice(0,8).map((s,i)=>(
              <div
                key={s}
                onClick={()=>choose(s)}
                style={{
                  padding:10,
                  cursor:"pointer",
                  background: i===index ? "#eee":"white"
                }}
              >
                {s}
              </div>
            ))}
          </div>
        )}

      </div>

      <button
        onClick={search}
        style={{
          padding:"0 16px",
          fontSize:16
        }}
      >
        Search
      </button>

    </div>
  );
}
