# 简体中文汉化说明（ZAC）

本仓库在官方 ZAC 之上增加了一层**运行时中文翻译层**，不改动任何既有模板与业务代码。

## 改动范围

| 文件 | 类型 | 说明 |
|---|---|---|
| `projects/app-ziti-console/src/app/i18n/zh-cn.dictionary.ts` | 新增 | 英→中词表（约 990 条） |
| `projects/app-ziti-console/src/app/i18n/i18n-runtime.ts` | 新增 | 翻译引擎（精确匹配 + 正则规则 + MutationObserver） |
| `projects/app-ziti-console/src/main.ts` | 修改 3 行 | 引入并安装翻译层 |

其余文件（125 个模板、316 个 TS 组件）**零改动**，因此与上游同步时冲突面极小。

## 工作机制

1. 页面渲染后，遍历 DOM 文本节点与 `placeholder`/`title`/`aria-label`/`alt` 属性，按**英文整串精确匹配**替换为中文。
2. 少量正则规则处理带动态值的句子，例如
   - `Active Services (3)` → `活跃服务（3）`
   - `Showing 4 of 9 circuits` → `正在显示 9 条电路中的 4 条`
3. `MutationObserver` 跟踪 Angular 的动态渲染（表格虚拟滚动、弹窗、提示、菜单），新插入的节点会被即时翻译。
4. 下列区域**不翻译**，避免污染配置内容：`pre` / `code` / `textarea`、`.jsoneditor`、`.ace_editor`、`.monaco-editor`、`.CodeMirror`。
5. 未命中词表的文本原样保留，因此身份名、服务名、ID、URL 等动态数据不会被误改。

## 如何启用 / 关闭

汉化默认启用。浏览器控制台：

```js
window.zitiI18n.off();     // 停止后续翻译（已翻译内容不回滚）
window.zitiI18n.on();      // 重新启用
window.zitiI18n.zh('Add Identity');  // 单条查询译文
```

如需局部豁免，在任意元素上加 `data-i18n-skip` 属性即可（其子树不参与翻译）。

## 如何扩展词表

在 `zh-cn.dictionary.ts` 的 `ZH_CN` 对象中按 `"英文原文": "中文译文"` 添加即可，键必须与源码中的写法**逐字一致**（含大小写与标点）。带变量拼接的句子请改 `i18n-runtime.ts` 中的 `PATTERNS`。

## 构建

```bash
npm ci
npm run build          # 产物在 dist/app-ziti-console
```

本汉化层已在 Node 25 + Angular CLI 20 下通过 `npm run build`，并通过 15 项 jsdom 行为测试（精确匹配、占位符、动态节点、编辑区跳过、空白保留等）。

## 已知限制

- 后端（控制器 API）返回的英文枚举值、错误详情不在此层覆盖范围，需按需在词表中补条目。
- 深色/浅色主题、字体、布局未做改动；中文排版依赖浏览器默认字体回退。