# CloakMesh 管理控制台

CloakMesh 的 Web 管理控制台，fork 自 [OpenZiti ZAC](https://github.com/openziti/ziti-console)（Apache License 2.0）。

> 国内网络可用 Gitee 镜像：`https://gitee.com/cloakmesh/console.git`

> **上游说明**：本仓库保留上游全部历史与许可。核心能力（身份、服务、策略、路由器、证书、可视化）完全来自上游；CloakMesh 的差异是**简体中文界面**与**品牌化**。

## 与上游的差异

| 项目 | 上游 | CloakMesh |
|---|---|---|
| 界面语言 | 英文 | 简体中文（运行时翻译层，约 990 条词表） |
| 产品名 | Ziti Admin Console | CloakMesh 管理控制台 |
| npm 包名 | `io.netfoundry.zac` | `io.cloakmesh.console` |
| 环境变量前缀 | `ZAC_*` / `ZITI_*` | `CLOAKMESH_*`（启动时映射回上游变量） |
| 镜像 | `netfoundry/ziti-console` | `cloakmesh/console` |

汉化实现细节见 [`I18N-zh-CN.md`](I18N-zh-CN.md)；品牌化机制见下节。

## 环境变量

对外统一使用 `CLOAKMESH_*`，`server.js` 启动时映射为上游读取的 `ZAC_*` / `ZITI_*`（已存在的原变量优先）：

| 你写的 | 等价上游变量 | 说明 |
|---|---|---|
| `CLOAKMESH_CONTROLLER_URLS` | `ZAC_CONTROLLER_URLS` | 控制器地址，逗号分隔 |
| `CLOAKMESH_CONTROLLER_URL` | `ZAC_CONTROLLER_URL` | 单个控制器地址 |
| `CLOAKMESH_SESSION_SECRET` | `ZAC_SESSION_SECRET` | 会话加密密钥 |
| `CLOAKMESH_COOKIE_SECURE` | `ZAC_COOKIE_SECURE` | 强制 Secure Cookie |
| `CLOAKMESH_SERVER_KEY` / `CLOAKMESH_SERVER_CERT_CHAIN` | `ZAC_SERVER_KEY` / `ZAC_SERVER_CERT_CHAIN` | 启用 HTTPS |
| `CLOAKMESH_REJECT_UNAUTHORIZED` | `ZAC_REJECT_UNAUTHORIZED` | 校验控制器 TLS 证书 |
| `CLOAKMESH_CTRL_EDGE_ADVERTISED_ADDRESS` | `ZITI_CTRL_EDGE_ADVERTISED_ADDRESS` | 单控制器便捷变量 |

## 构建

```bash
npm ci
npm run build          # 产物 dist/app-ziti-console
```

容器镜像：

```bash
docker build -f docker-images/cloakmesh-console/Dockerfile -t cloakmesh/console:local .
docker run --rm -p 8080:80 cloakmesh/console:local
```

静态托管时把 `dist/app-ziti-console` 目录交给任意 Web 服务器即可（SPA 需要 fallback 到 `index.html`）。ZAC 在启动时按 URL 自动推断挂载路径（`<base href>`），可挂在任意层级的子路径下。

## 使用

浏览器打开控制台 → 输入控制器地址（如 `https://cloakmesh.example.com:1280`）→ 用管理员账号登录。

界面语言默认中文，可在浏览器控制台切换：

```js
zitiI18n.off();   // 回退英文
zitiI18n.on();    // 恢复中文
```

## 许可

Apache License 2.0，与上游一致。