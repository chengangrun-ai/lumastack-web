# 叠光 LumaStack

把「公子视频屋」桌面版改造成的纯静态网页工作台。

- 线上：https://chengangrun-ai.github.io/lumastack-web/
- 仓库：https://github.com/chengangrun-ai/lumastack-web
- 本地预览：在本目录跑 `python -m http.server 8899`，打开 `http://127.0.0.1:8899/`

## 名字

叠光 LumaStack。取「把动效层叠在口播原片上」的意思。原桌面程序与旧工程保持不动，网页版是独立目录。

## 来源（都用最新版）

| 来源 | 版本 | 时间 | 许可 | 取了什么 |
|---|---|---|---|---|
| [jeszhou/overlay-studio](https://github.com/jeszhou/overlay-studio) | v1.2.0，提交 e35e1aff | 2026-10-17 | 自定义免费使用协议 | 20 张动效卡、11 个用途分组、编排体检规则、15 个 CC0 音效、28 秒示例编排、SRT 编排思路 |
| [motiontemplates/385712](https://github.com/motiontemplates/385712) | 0.2.7-open-beta，提交 9dfbe7d7 | 2026-10-19 | MIT | 27 组科技场景结构、B1–B4 四种文字表达、参数契约、字体与音效机制 |
| 本机公子视频屋 | 提交 080a44e9，安装版 v7 | 2026-10-30 | 本机改造 | 7 页工作台骨架、`.ms-app` 视觉令牌、6 张社区扩展卡、6 个官方扩展示例、资源目录、工程 JSON 结构 |
| MotionGit 官网 | 更新于 2026-10-30，25 个版本 | 2026-10-30 | 页面观察 | 确认公开版与官网个人版的差异，官网独有项未搬进网页版 |

REA 静态分析证据：`ev_60d2a81da7ccf6c75966427dd7bd529210939a8a6f20944488e2053d94080493`（39 个文件、22 个 JS、74614 个语法节点），确认 .motion 原版技术栈是 playwright-core 驱动 Chrome 逐帧 `renderAt(t)` 截帧喂 ffmpeg，配 Python 音效合成与 adapter.py 的 JSON Schema 校验。B1–B4 用 Canvas 2D 等价重建，逐帧按时间真实绘制。

详细审计报告在 `../research/gongzi-source-audit.md` 与 `../research/opensource-latest-audit.md`。

## 目录

```
index.html                 落地页 + 工作台容器
assets/
  landing.css              落地页样式，遵守 landing-page-design
  app.css                  工作台样式，沿用改造版 .ms-app 令牌
  app.js                   工作台逻辑：状态、时间轴、渲染、导入、体检、导出
  cards.js                 26 张动效卡 + 6 个官方示例 + B1–B4 的 Canvas 渲染器
  bundle.js                离线数据包（由 build-bundle.cjs 生成）
  favicon.svg
  fonts/                   Geist / Geist Mono / Noto Sans SC / Anton
public/
  data/                    场景目录、示例元数据、名称表、示例编排
  sfx-default/             15 个 CC0 默认音效
build-bundle.cjs           重新生成离线数据包的脚本
```

## 功能清单

打开工作台后左侧 7 个页面：制作、模板库、素材、音效、官方扩展示例、使用流程、设置。

- 26 张动效卡，12 个用途分组，每张都有真实逐帧动画和 3 项以上可改参数
- 4 种原生文字场景 B1–B4，27 组科技场景结构说明
- 6 个官方扩展示例，独立参数面板与独立播放
- 1920×1080 / 60fps 画布，按时间逐帧绘制；空格播放、拖动时间轴、参数改动实时生效
- 场景轨 + 动效层双时间轴，选中、复制、前移后移、删除、撤销重做 60 步
- 编排体检：占位文案、时间越界、快闪、叠卡、空白段等规则，可逐条忽略
- SRT 导入自动语义编排，按关键词挑卡并对齐时间
- 导入导出工程 JSON；图片视频音频字体上传并绑定场景
- 15 个默认音效试听与自动配对
- 导出：当前帧 PNG、逐帧透明 PNG 序列 ZIP（自写 store 模式 ZIP）、预览 WebM、工程 JSON
- 亮暗跟随系统三档外观，本机自动保存，无账号无上传

## 已知边界

官网个人包里的竖屏、人脸自动居中、素材关联 API 需要登录与私有接口，未搬入。原版 23 组原生场景依赖私有媒体素材与 Python 合成引擎，这一版如实列出场景结构与字段数，不做假装能用的空壳。正式 ProRes 4444 MOV 需要服务端 ffmpeg，纯静态版提供逐帧 PNG 序列与 WebM 预览。

## 许可说明

overlay-studio 上游是自定义「免费使用、禁止转售、禁止作为对外同类服务」协议，不是 MIT；MotionGit 385712 模板包是 MIT；15 个默认音效是 CC0；字体是 OFL。部署前按自身场景核对上游条款。本项目代码为本次重建产物。
