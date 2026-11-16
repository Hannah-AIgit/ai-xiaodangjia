# AI 小当家

公开网页：https://hannah-aigit.github.io/ai-xiaodangjia/

一周食谱：https://hannah-aigit.github.io/ai-xiaodangjia/weekly-menu.html

采购：https://hannah-aigit.github.io/ai-xiaodangjia/shopping-budget.html

无需 ChatGPT 或 GitHub 登录。页面和图片托管在 GitHub Pages；AI 功能调用维护者的现有云端后端（该后端仍由 Sites 托管），不是完全独立的后端部署。API Key 只在后端 Secret 中，仓库不含 Key。

## 代码目录

- `AI-Home-Kitchen-Assistant/`：本地 Python 服务版，含全部页面及资源。
- `云端部署源码/`：云端服务适配代码与构建脚本。
- `docs/`：GitHub Pages 发布目录；`github-pages-runtime.js` 将 API 请求指向现有云端服务。

每台设备的家庭、会员 Demo、库存和采购记录保存在各自浏览器的 localStorage，不跨设备同步。会员支付、上门厨师和购物交易为 Demo。AI 调用使用维护者的 API 额度，额度不足或服务不可用时会显示提示。

部署：GitHub Settings → Pages → Deploy from a branch → `main` / `docs`。
更新 `docs/` 并推送到 `main` 后，GitHub Pages 自动发布。不要提交 `.env`、API Key、Cloudflare 或 GitHub Token。
