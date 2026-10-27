/**
 * ZAC 简体中文运行时翻译层
 *
 * 为什么用运行时层而不是 Angular i18n：
 * - 上游 ZAC 完全没有 i18n 基建，用框架方案要改动 100+ 个模板文件，与上游同步成本极高
 * - 运行时层只新增文件、只改 main.ts 两行，所有既有模板/业务代码零改动
 *
 * 工作方式：
 * 1. 渲染后按“英文整串精确匹配”查词表替换文本节点
 * 2. 少量正则规则处理带动态值的句子（如 "Active Services (3)"）
 * 3. 用 MutationObserver 跟踪 Angular 的动态渲染（弹窗、表格、提示）
 * 4. 代码编辑器、脚本等区域不翻译，避免污染 JSON/YAML 配置内容
 *
 * 关闭方式：window.zitiI18n.off()（或在任意元素上加 data-i18n-skip 属性）
 */
import { ZH_CN } from './zh-cn.dictionary';

interface PatternRule {
  re: RegExp;
  zh: string;
}

const PATTERNS: PatternRule[] = [
  { re: /^Showing (\d+) of (\d+) circuits$/, zh: '正在显示 $2 条电路中的 $1 条' },
  { re: /^(\d+) routers?$/, zh: '$1 个路由器' },
  { re: /^(\d+) router\(s\)$/, zh: '$1 个路由器' },
  { re: /^(\d+) circuits?$/, zh: '$1 条电路' },
  { re: /^Level (\d+)$/, zh: '第 $1 层' },
  { re: /^EXPIRES (.+)$/, zh: '过期于 $1' },
  { re: /^EXPIRED (.+)$/, zh: '已过期 $1' },
  { re: /^(\d+) errors?$/, zh: '$1 个错误' },
  { re: /^(\d+) warnings?$/, zh: '$1 条警告' },
  { re: /^(\d+) selected$/, zh: '已选择 $1 项' },
  { re: /^No (.+) found matching "?([^"]*)"?$/, zh: '未找到匹配“$2”的$1' },
  { re: /^No (.+) found$/, zh: '未找到$1' },
  { re: /^Select a date to (reset|reissue) the enrollment token$/, zh: '选择日期以$1登记令牌' },
  { re: /^The following entities were (updated|created) for this service$/, zh: '为此外服务$1了以下实体' },
  { re: /^Nothing is sent to the (.+)\.$/, zh: '不会向$1发送任何内容。' },
  { re: /^The running (.+) keeps its current configuration\.$/, zh: '运行中的$1保持当前配置。' },
  { re: /^(.+) \(New Attribute\)$/, zh: '$1（新属性）' },
  { re: /^Is (.+) \(New Attribute\)$/, zh: '$1（新属性）' },
];

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA', 'NOSCRIPT', 'KBD', 'SAMP', 'SVG', 'PATH',
]);

const SKIP_SELECTOR = [
  '.jsoneditor',
  '.jq-jsoneditor',
  '.ace_editor',
  '.cm-editor',
  '.CodeMirror',
  '.monaco-editor',
  '.hljs',
  '[data-i18n-skip]',
].join(',');

const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

const exactCache = new Map<string, string>();
let installed = false;
let observer: MutationObserver | null = null;

function lookup(key: string): string | undefined {
  const cached = exactCache.get(key);
  if (cached !== undefined) return cached === '' ? undefined : cached;

  let out: string | undefined = ZH_CN[key];

  // "Status:" 这类以冒号结尾而词表里只有 "Status" 的情况
  if (out === undefined && key.endsWith(':')) {
    const base = ZH_CN[key.slice(0, -1)];
    if (base !== undefined) out = base + '：';
  }

  // "可用身份（3）" 这类 “标签 + (数字)” 的组合
  if (out === undefined) {
    const m = /^(.+?)\s*\((\d+)\)$/.exec(key);
    if (m) {
      const base = ZH_CN[m[1]];
      if (base !== undefined) out = base + '（' + m[2] + '）';
    }
  }

  if (out === undefined) {
    for (const rule of PATTERNS) {
      const m = rule.re.exec(key);
      if (m) {
        out = rule.zh.replace(/\$(\d)/g, (_all: string, idx: string) => m[Number(idx)] ?? '');
        break;
      }
    }
  }

  exactCache.set(key, out === undefined ? '' : out);
  return out;
}

/** 翻译单个英文字符串；未命中词表时原样返回。 */
export function zh(text: string): string {
  if (!text) return text;
  const key = text.trim().replace(/\s+/g, ' ');
  if (key.length === 0) return text;
  const out = lookup(key);
  if (out === undefined) return text;
  return out;
}

function isSkipped(el: Element | null): boolean {
  for (let e: Element | null = el; e; e = e.parentElement) {
    if (SKIP_TAGS.has(e.tagName.toUpperCase())) return true;
    if (e.hasAttribute('data-i18n-skip')) return true;
  }
  return el ? el.closest(SKIP_SELECTOR) !== null : false;
}

function translateTextNode(node: Text): void {
  if (!node.nodeValue) return;
  const raw = node.nodeValue;
  if (!/[A-Za-z]/.test(raw)) return;
  const parent = node.parentElement;
  if (!parent || isSkipped(parent)) return;

  const lead = /^\s*/.exec(raw)?.[0] ?? '';
  const trail = /\s*$/.exec(raw)?.[0] ?? '';
  const body = raw.slice(lead.length, raw.length - trail.length);
  const out = lookup(body.replace(/\s+/g, ' '));
  if (out === undefined) return;

  const next = lead + out + trail;
  if (next === raw) return;
  node.nodeValue = next;
}

function translateAttributes(el: Element): void {
  if (isSkipped(el)) return;
  for (const attr of ATTRS) {
    const val = el.getAttribute(attr);
    if (!val || !/[A-Za-z]/.test(val)) continue;
    const out = lookup(val.trim().replace(/\s+/g, ' '));
    if (out === undefined || out === val) continue;
    el.setAttribute(attr, out);
  }
}

function walk(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  translateAttributes(el);
  for (let child = el.firstChild; child; child = child.nextSibling) {
    walk(child);
  }
}

let pending = false;
const dirtyRoots = new Set<Node>();

function flush(): void {
  pending = false;
  const roots = Array.from(dirtyRoots);
  dirtyRoots.clear();
  for (const root of roots) {
    if (root.isConnected) walk(root);
  }
  if (document.title) {
    const t = document.title.trim();
    const out = lookup(t);
    if (out !== undefined && out !== t) document.title = out;
  }
}

function schedule(root: Node): void {
  dirtyRoots.add(root);
  if (pending) return;
  pending = true;
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(flush);
  } else {
    setTimeout(flush, 16);
  }
}

function startObserver(): void {
  if (observer) return;
  observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') {
        schedule(record.target);
      } else if (record.type === 'childList') {
        record.addedNodes.forEach((n) => schedule(n));
      } else if (record.type === 'attributes' && record.target.nodeType === Node.ELEMENT_NODE) {
        schedule(record.target);
      }
    }
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRS,
  });
}

/** 安装翻译层。重复调用无副作用。 */
export function installZhCn(): void {
  if (installed) return;
  installed = true;
  document.documentElement.setAttribute('lang', 'zh-CN');
  walk(document.documentElement);
  startObserver();
}

/** 停止翻译层（已翻译的文本保持不变）。 */
export function uninstallZhCn(): void {
  if (!installed) return;
  installed = false;
  observer?.disconnect();
  observer = null;
}

interface ZitiI18nApi {
  zh(text: string): string;
  on(): void;
  off(): void;
  enabled(): boolean;
}

declare global {
  interface Window {
    zitiI18n?: ZitiI18nApi;
  }
}

if (typeof window !== 'undefined') {
  window.zitiI18n = {
    zh,
    on: installZhCn,
    off: uninstallZhCn,
    enabled: () => installed,
  };
}